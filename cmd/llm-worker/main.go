package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/heph-ai/ai-processing-platform/internal/config"
	"github.com/heph-ai/ai-processing-platform/internal/model"
	"github.com/heph-ai/ai-processing-platform/internal/queue"
	"github.com/heph-ai/ai-processing-platform/internal/repository"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.PostgresDSN)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	defer rdb.Close()

	mq, err := queue.NewRabbitMQ(cfg.RabbitMQURL)
	if err != nil {
		log.Fatalf("connect rabbitmq: %v", err)
	}
	defer mq.Close()

	if err := mq.DeclareQueue("llm_tasks"); err != nil {
		log.Fatalf("declare queue: %v", err)
	}

	repo := repository.NewTaskRepo(pool)

	msgs, err := mq.Consume("llm_tasks")
	if err != nil {
		log.Fatalf("consume: %v", err)
	}

	log.Println("LLM Worker started, waiting for tasks...")

	for {
		select {
		case <-ctx.Done():
			log.Println("LLM Worker shutting down...")
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}

			var taskMsg model.TaskMessage
			if err := json.Unmarshal(msg.Body, &taskMsg); err != nil {
				log.Printf("unmarshal error: %v", err)
				msg.Nack(false, false)
				continue
			}

			log.Printf("Processing LLM task: %s", taskMsg.TaskID)

			lockKey := fmt.Sprintf("lock:llm:%s", taskMsg.TaskID)
			ok, err := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
			if err != nil || !ok {
				log.Printf("Task %s already being processed, skipping", taskMsg.TaskID)
				msg.Ack(false)
				continue
			}

			task, err := repo.GetByID(ctx, taskMsg.TaskID)
			if err != nil {
				log.Printf("Get task failed: %v", err)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			if task.Transcript == nil {
				log.Printf("Task %s has no transcript, skipping", taskMsg.TaskID)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			summary, err := callLLM(cfg.LLMEndpoint, *task.Transcript)
			if err != nil {
				log.Printf("LLM call failed for task %s: %v", taskMsg.TaskID, err)
				repo.UpdateFailed(ctx, taskMsg.TaskID, err.Error())
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			if err := repo.UpdateLLMResult(ctx, taskMsg.TaskID, summary); err != nil {
				log.Printf("DB update failed for task %s: %v", taskMsg.TaskID, err)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			rdb.Del(ctx, "task:"+taskMsg.TaskID.String())

			log.Printf("LLM task %s completed successfully", taskMsg.TaskID)
			msg.Ack(false)
		}
	}
}

func callLLM(endpoint, text string) (string, error) {
	reqBody, _ := json.Marshal(map[string]string{"text": text})
	resp, err := http.Post(endpoint+"/summarize", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("llm request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("llm returned %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Summary string `json:"summary"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode llm response: %w", err)
	}
	return result.Summary, nil
}
