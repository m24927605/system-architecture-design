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

	for _, q := range []string{"stt_tasks", "llm_tasks"} {
		if err := mq.DeclareQueue(q); err != nil {
			log.Fatalf("declare queue %s: %v", q, err)
		}
	}

	repo := repository.NewTaskRepo(pool)

	msgs, err := mq.Consume("stt_tasks")
	if err != nil {
		log.Fatalf("consume: %v", err)
	}

	log.Println("STT Worker started, waiting for tasks...")

	for {
		select {
		case <-ctx.Done():
			log.Println("STT Worker shutting down...")
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

			log.Printf("Processing STT task: %s", taskMsg.TaskID)

			lockKey := fmt.Sprintf("lock:stt:%s", taskMsg.TaskID)
			ok, err := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
			if err != nil || !ok {
				log.Printf("Task %s already being processed, skipping", taskMsg.TaskID)
				msg.Ack(false)
				continue
			}

			transcript, err := callSTT(cfg.STTEndpoint, taskMsg.AudioKey)
			if err != nil {
				log.Printf("STT call failed for task %s: %v", taskMsg.TaskID, err)
				repo.UpdateFailed(ctx, taskMsg.TaskID, err.Error())
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			if err := repo.UpdateSTTResult(ctx, taskMsg.TaskID, transcript); err != nil {
				log.Printf("DB update failed for task %s: %v", taskMsg.TaskID, err)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			llmMsg := model.TaskMessage{TaskID: taskMsg.TaskID}
			if err := mq.Publish(ctx, "llm_tasks", llmMsg); err != nil {
				log.Printf("Failed to publish LLM task %s: %v", taskMsg.TaskID, err)
				msg.Nack(false, true)
				continue
			}

			rdb.Del(ctx, "task:"+taskMsg.TaskID.String())

			log.Printf("STT task %s completed, forwarded to LLM queue", taskMsg.TaskID)
			msg.Ack(false)
		}
	}
}

func callSTT(endpoint, audioKey string) (string, error) {
	reqBody, _ := json.Marshal(map[string]string{"audio_key": audioKey})
	resp, err := http.Post(endpoint+"/transcribe", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("stt request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("stt returned %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode stt response: %w", err)
	}
	return result.Text, nil
}
