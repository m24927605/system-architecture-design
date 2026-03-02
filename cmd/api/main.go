package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/redis/go-redis/v9"

	"github.com/heph-ai/ai-processing-platform/internal/config"
	"github.com/heph-ai/ai-processing-platform/internal/handler"
	"github.com/heph-ai/ai-processing-platform/internal/queue"
	"github.com/heph-ai/ai-processing-platform/internal/repository"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx := context.Background()

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

	if err := mq.DeclareQueue("stt_tasks"); err != nil {
		log.Fatalf("declare queue: %v", err)
	}

	repo := repository.NewTaskRepo(pool)
	taskHandler := handler.NewTaskHandler(repo, mq, rdb)

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	api := e.Group("/api/v1")
	api.POST("/tasks", taskHandler.CreateTask)
	api.GET("/tasks/:id", taskHandler.GetTask)
	api.GET("/tasks", taskHandler.ListTasks)

	fmt.Printf("API server starting on :%s\n", cfg.APIPort)
	e.Logger.Fatal(e.Start(":" + cfg.APIPort))
}
