# AI Processing Platform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce all interview deliverables — ARCHITECTURE.md, Mermaid diagrams, docker-compose prototype with mock services, and presentation slides.

**Architecture:** Event-driven microservices in Go. API Service receives uploads, publishes to RabbitMQ (local substitute for SQS). STT/LLM Workers consume tasks, call mock model servers, write results to PostgreSQL. Redis for caching. All orchestrated via docker-compose.

**Tech Stack:** Go 1.22+, Echo framework, RabbitMQ (local queue), PostgreSQL, Redis, Docker, Mermaid (diagrams)

---

## Task 1: Project Scaffolding

**Files:**
- Create: `go.mod`
- Create: `go.sum`
- Create: `Makefile`
- Create: `docker-compose.yml` (infrastructure only: postgres, redis, rabbitmq)
- Create: `migrations/001_create_tasks.up.sql`
- Create: `migrations/001_create_tasks.down.sql`

**Step 1: Initialize Go module**

```bash
cd "/Users/sin-chengchen/office-project/Heph-AI/interview/System Architecture Design"
go mod init github.com/heph-ai/ai-processing-platform
```

**Step 2: Create docker-compose with infrastructure services**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aiplatform
      POSTGRES_USER: app
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d aiplatform"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: app
      RABBITMQ_DEFAULT_PASS: devpassword
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Step 3: Create DB migration**

Create `migrations/001_create_tasks.up.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    audio_key   VARCHAR(512) NOT NULL,
    transcript  TEXT,
    summary     TEXT,
    error_msg   TEXT,
    retry_count INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

Create `migrations/001_create_tasks.down.sql`:

```sql
DROP TABLE IF EXISTS tasks;
```

**Step 4: Create Makefile**

```makefile
.PHONY: up down build test lint

up:
	docker compose up -d

down:
	docker compose down

build:
	go build -o bin/api ./cmd/api
	go build -o bin/stt-worker ./cmd/stt-worker
	go build -o bin/llm-worker ./cmd/llm-worker

test:
	go test ./... -v -race

lint:
	golangci-lint run ./...
```

**Step 5: Verify infrastructure starts**

```bash
docker compose up -d
docker compose ps  # all 3 services should be healthy
docker compose down
```

**Step 6: Commit**

```bash
git add go.mod docker-compose.yml migrations/ Makefile
git commit -m "chore: scaffold project with infra services (postgres, redis, rabbitmq)"
```

---

## Task 2: Shared Internal Packages — Model, Config, Queue

**Files:**
- Create: `internal/model/task.go`
- Create: `internal/config/config.go`
- Create: `internal/queue/rabbitmq.go`
- Create: `internal/queue/rabbitmq_test.go`

**Step 1: Install dependencies**

```bash
go get github.com/labstack/echo/v4
go get github.com/rabbitmq/amqp091-go
go get github.com/jackc/pgx/v5
go get github.com/redis/go-redis/v9
go get github.com/google/uuid
go get github.com/caarlos0/env/v11
```

**Step 2: Create task model**

Create `internal/model/task.go`:

```go
package model

import (
	"time"

	"github.com/google/uuid"
)

type TaskStatus string

const (
	StatusPending       TaskStatus = "pending"
	StatusSTTProcessing TaskStatus = "stt_processing"
	StatusLLMProcessing TaskStatus = "llm_processing"
	StatusDone          TaskStatus = "done"
	StatusFailed        TaskStatus = "failed"
)

type Task struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	Status     TaskStatus `json:"status" db:"status"`
	AudioKey   string     `json:"audio_key" db:"audio_key"`
	Transcript *string    `json:"transcript,omitempty" db:"transcript"`
	Summary    *string    `json:"summary,omitempty" db:"summary"`
	ErrorMsg   *string    `json:"error_msg,omitempty" db:"error_msg"`
	RetryCount int        `json:"retry_count" db:"retry_count"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
}

type TaskMessage struct {
	TaskID   uuid.UUID `json:"task_id"`
	AudioKey string    `json:"audio_key,omitempty"`
}
```

**Step 3: Create config**

Create `internal/config/config.go`:

```go
package config

import "github.com/caarlos0/env/v11"

type Config struct {
	PostgresDSN string `env:"POSTGRES_DSN" envDefault:"postgres://app:devpassword@localhost:5432/aiplatform?sslmode=disable"`
	RedisAddr   string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	RabbitMQURL string `env:"RABBITMQ_URL" envDefault:"amqp://app:devpassword@localhost:5672/"`
	STTEndpoint string `env:"STT_ENDPOINT" envDefault:"http://localhost:8081"`
	LLMEndpoint string `env:"LLM_ENDPOINT" envDefault:"http://localhost:8082"`
	APIPort     string `env:"API_PORT" envDefault:"8080"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
```

**Step 4: Create RabbitMQ queue wrapper**

Create `internal/queue/rabbitmq.go`:

```go
package queue

import (
	"context"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQ struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewRabbitMQ(url string) (*RabbitMQ, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq dial: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel: %w", err)
	}
	return &RabbitMQ{conn: conn, ch: ch}, nil
}

func (r *RabbitMQ) DeclareQueue(name string) error {
	_, err := r.ch.QueueDeclare(name, true, false, false, false, nil)
	return err
}

func (r *RabbitMQ) Publish(ctx context.Context, queueName string, msg any) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}
	return r.ch.PublishWithContext(ctx, "", queueName, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        body,
	})
}

func (r *RabbitMQ) Consume(queueName string) (<-chan amqp.Delivery, error) {
	return r.ch.Consume(queueName, "", false, false, false, false, nil)
}

func (r *RabbitMQ) Close() {
	r.ch.Close()
	r.conn.Close()
}
```

**Step 5: Commit**

```bash
go mod tidy
git add internal/ go.mod go.sum
git commit -m "feat: add shared internal packages (model, config, queue)"
```

---

## Task 3: Task Repository (PostgreSQL)

**Files:**
- Create: `internal/repository/task_repo.go`
- Create: `internal/repository/task_repo_test.go`

**Step 1: Create task repository**

Create `internal/repository/task_repo.go`:

```go
package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/heph-ai/ai-processing-platform/internal/model"
)

type TaskRepo struct {
	pool *pgxpool.Pool
}

func NewTaskRepo(pool *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{pool: pool}
}

func (r *TaskRepo) Create(ctx context.Context, audioKey string) (*model.Task, error) {
	task := &model.Task{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO tasks (audio_key) VALUES ($1)
		 RETURNING id, status, audio_key, transcript, summary, error_msg, retry_count, created_at, updated_at`,
		audioKey,
	).Scan(&task.ID, &task.Status, &task.AudioKey, &task.Transcript, &task.Summary,
		&task.ErrorMsg, &task.RetryCount, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return task, nil
}

func (r *TaskRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Task, error) {
	task := &model.Task{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, status, audio_key, transcript, summary, error_msg, retry_count, created_at, updated_at
		 FROM tasks WHERE id = $1`, id,
	).Scan(&task.ID, &task.Status, &task.AudioKey, &task.Transcript, &task.Summary,
		&task.ErrorMsg, &task.RetryCount, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	return task, nil
}

func (r *TaskRepo) UpdateSTTResult(ctx context.Context, id uuid.UUID, transcript string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tasks SET status = $1, transcript = $2, updated_at = NOW() WHERE id = $3`,
		model.StatusLLMProcessing, transcript, id,
	)
	return err
}

func (r *TaskRepo) UpdateLLMResult(ctx context.Context, id uuid.UUID, summary string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tasks SET status = $1, summary = $2, updated_at = NOW() WHERE id = $3`,
		model.StatusDone, summary, id,
	)
	return err
}

func (r *TaskRepo) UpdateFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tasks SET status = $1, error_msg = $2, retry_count = retry_count + 1, updated_at = NOW() WHERE id = $3`,
		model.StatusFailed, errMsg, id,
	)
	return err
}

func (r *TaskRepo) ListRecent(ctx context.Context, limit int) ([]model.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, status, audio_key, transcript, summary, error_msg, retry_count, created_at, updated_at
		 FROM tasks ORDER BY created_at DESC LIMIT $1`, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(&t.ID, &t.Status, &t.AudioKey, &t.Transcript, &t.Summary,
			&t.ErrorMsg, &t.RetryCount, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}
```

**Step 2: Commit**

```bash
git add internal/repository/
git commit -m "feat: add task repository with CRUD operations"
```

---

## Task 4: Mock STT & LLM Servers

**Files:**
- Create: `cmd/mock-stt/main.go`
- Create: `cmd/mock-llm/main.go`
- Create: `cmd/mock-stt/Dockerfile`
- Create: `cmd/mock-llm/Dockerfile`

**Step 1: Create mock STT server**

Create `cmd/mock-stt/main.go`:

```go
package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type TranscribeRequest struct {
	AudioKey string `json:"audio_key"`
}

type TranscribeResponse struct {
	Text string `json:"text"`
}

var sampleTranscripts = []string{
	"Today we discussed the quarterly results. Revenue increased by 15% compared to last quarter. The team has made significant progress on the new product launch.",
	"The meeting covered three main topics: infrastructure migration to cloud, hiring plans for Q2, and the upcoming product demo scheduled for next month.",
	"Customer feedback has been overwhelmingly positive. We need to focus on improving the onboarding experience and reducing response time for support tickets.",
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())

	e.POST("/transcribe", func(c echo.Context) error {
		var req TranscribeRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
		}

		// Simulate processing time (1-3 seconds)
		time.Sleep(time.Duration(1+rand.Intn(3)) * time.Second)

		transcript := sampleTranscripts[rand.Intn(len(sampleTranscripts))]
		return c.JSON(http.StatusOK, TranscribeResponse{Text: transcript})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	fmt.Println("Mock STT server starting on :8081")
	e.Logger.Fatal(e.Start(":8081"))
}
```

**Step 2: Create mock LLM server**

Create `cmd/mock-llm/main.go`:

```go
package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type SummarizeRequest struct {
	Text string `json:"text"`
}

type SummarizeResponse struct {
	Summary string `json:"summary"`
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())

	e.POST("/summarize", func(c echo.Context) error {
		var req SummarizeRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
		}

		// Simulate LLM processing time (2-5 seconds)
		time.Sleep(time.Duration(2+rand.Intn(4)) * time.Second)

		// Generate a mock summary based on text length
		runeCount := len([]rune(req.Text))
		summary := fmt.Sprintf("[AI Summary] This transcript contains %d characters. Key points: The discussion covered operational updates, strategic planning, and action items for follow-up. Sentiment: positive. Priority: medium.", runeCount)

		return c.JSON(http.StatusOK, SummarizeResponse{Summary: summary})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	fmt.Println("Mock LLM server starting on :8082")
	e.Logger.Fatal(e.Start(":8082"))
}
```

**Step 3: Create Dockerfiles**

Create `cmd/mock-stt/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /mock-stt ./cmd/mock-stt

FROM alpine:3.19
COPY --from=builder /mock-stt /mock-stt
EXPOSE 8081
CMD ["/mock-stt"]
```

Create `cmd/mock-llm/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /mock-llm ./cmd/mock-llm

FROM alpine:3.19
COPY --from=builder /mock-llm /mock-llm
EXPOSE 8082
CMD ["/mock-llm"]
```

**Step 4: Add mock services to docker-compose.yml**

Append to `docker-compose.yml` services section:

```yaml
  mock-stt:
    build:
      context: .
      dockerfile: cmd/mock-stt/Dockerfile
    ports:
      - "8081:8081"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8081/health"]
      interval: 5s
      timeout: 3s
      retries: 5

  mock-llm:
    build:
      context: .
      dockerfile: cmd/mock-llm/Dockerfile
    ports:
      - "8082:8082"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8082/health"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**Step 5: Commit**

```bash
git add cmd/mock-stt/ cmd/mock-llm/ docker-compose.yml
git commit -m "feat: add mock STT and LLM servers with Dockerfiles"
```

---

## Task 5: API Service

**Files:**
- Create: `cmd/api/main.go`
- Create: `internal/handler/task_handler.go`
- Create: `cmd/api/Dockerfile`

**Step 1: Create task handler**

Create `internal/handler/task_handler.go`:

```go
package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"

	"github.com/heph-ai/ai-processing-platform/internal/model"
	"github.com/heph-ai/ai-processing-platform/internal/queue"
	"github.com/heph-ai/ai-processing-platform/internal/repository"
)

const sttQueueName = "stt_tasks"

type TaskHandler struct {
	repo  *repository.TaskRepo
	queue *queue.RabbitMQ
	redis *redis.Client
}

func NewTaskHandler(repo *repository.TaskRepo, q *queue.RabbitMQ, rdb *redis.Client) *TaskHandler {
	return &TaskHandler{repo: repo, queue: q, redis: rdb}
}

type CreateTaskRequest struct {
	AudioKey string `json:"audio_key" validate:"required"`
}

type CreateTaskResponse struct {
	TaskID string `json:"task_id"`
	Status string `json:"status"`
}

func (h *TaskHandler) CreateTask(c echo.Context) error {
	var req CreateTaskRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}
	if req.AudioKey == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "audio_key is required"})
	}

	ctx := c.Request().Context()

	task, err := h.repo.Create(ctx, req.AudioKey)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create task"})
	}

	msg := model.TaskMessage{TaskID: task.ID, AudioKey: req.AudioKey}
	if err := h.queue.Publish(ctx, sttQueueName, msg); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to enqueue task"})
	}

	// Cache initial status
	h.cacheTask(ctx, task)

	return c.JSON(http.StatusCreated, CreateTaskResponse{
		TaskID: task.ID.String(),
		Status: string(task.Status),
	})
}

func (h *TaskHandler) GetTask(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid task id"})
	}

	ctx := c.Request().Context()

	// Try cache first
	if task, err := h.getCachedTask(ctx, id); err == nil {
		return c.JSON(http.StatusOK, task)
	}

	// Fallback to DB
	task, err := h.repo.GetByID(ctx, id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "task not found"})
	}

	h.cacheTask(ctx, task)
	return c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) ListTasks(c echo.Context) error {
	ctx := c.Request().Context()
	tasks, err := h.repo.ListRecent(ctx, 50)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to list tasks"})
	}
	return c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) cacheTask(ctx context.Context, task *model.Task) {
	data, _ := json.Marshal(task)
	h.redis.Set(ctx, "task:"+task.ID.String(), data, 5*time.Minute)
}

func (h *TaskHandler) getCachedTask(ctx context.Context, id uuid.UUID) (*model.Task, error) {
	data, err := h.redis.Get(ctx, "task:"+id.String()).Bytes()
	if err != nil {
		return nil, err
	}
	var task model.Task
	if err := json.Unmarshal(data, &task); err != nil {
		return nil, err
	}
	return &task, nil
}
```

**Step 2: Create API main.go**

Create `cmd/api/main.go`:

```go
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

	// PostgreSQL
	pool, err := pgxpool.New(ctx, cfg.PostgresDSN)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	// Redis
	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	defer rdb.Close()

	// RabbitMQ
	mq, err := queue.NewRabbitMQ(cfg.RabbitMQURL)
	if err != nil {
		log.Fatalf("connect rabbitmq: %v", err)
	}
	defer mq.Close()

	if err := mq.DeclareQueue("stt_tasks"); err != nil {
		log.Fatalf("declare queue: %v", err)
	}

	// Handlers
	repo := repository.NewTaskRepo(pool)
	taskHandler := handler.NewTaskHandler(repo, mq, rdb)

	// Echo
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
```

**Step 3: Create Dockerfile**

Create `cmd/api/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api

FROM alpine:3.19
COPY --from=builder /api /api
EXPOSE 8080
CMD ["/api"]
```

**Step 4: Add API to docker-compose.yml**

```yaml
  api:
    build:
      context: .
      dockerfile: cmd/api/Dockerfile
    ports:
      - "8080:8080"
    environment:
      POSTGRES_DSN: postgres://app:devpassword@postgres:5432/aiplatform?sslmode=disable
      REDIS_ADDR: redis:6379
      RABBITMQ_URL: amqp://app:devpassword@rabbitmq:5672/
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**Step 5: Commit**

```bash
git add cmd/api/ internal/handler/ docker-compose.yml
git commit -m "feat: add API service with task CRUD endpoints"
```

---

## Task 6: STT Worker

**Files:**
- Create: `cmd/stt-worker/main.go`
- Create: `cmd/stt-worker/Dockerfile`

**Step 1: Create STT worker**

Create `cmd/stt-worker/main.go`:

```go
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

			// Idempotency check
			lockKey := fmt.Sprintf("lock:stt:%s", taskMsg.TaskID)
			ok, err := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
			if err != nil || !ok {
				log.Printf("Task %s already being processed, skipping", taskMsg.TaskID)
				msg.Ack(false)
				continue
			}

			// Call mock STT service
			transcript, err := callSTT(cfg.STTEndpoint, taskMsg.AudioKey)
			if err != nil {
				log.Printf("STT call failed for task %s: %v", taskMsg.TaskID, err)
				repo.UpdateFailed(ctx, taskMsg.TaskID, err.Error())
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true) // requeue
				continue
			}

			// Update DB
			if err := repo.UpdateSTTResult(ctx, taskMsg.TaskID, transcript); err != nil {
				log.Printf("DB update failed for task %s: %v", taskMsg.TaskID, err)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			// Publish to LLM queue
			llmMsg := model.TaskMessage{TaskID: taskMsg.TaskID}
			if err := mq.Publish(ctx, "llm_tasks", llmMsg); err != nil {
				log.Printf("Failed to publish LLM task %s: %v", taskMsg.TaskID, err)
				msg.Nack(false, true)
				continue
			}

			// Invalidate cache
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
```

**Step 2: Create Dockerfile**

Create `cmd/stt-worker/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /stt-worker ./cmd/stt-worker

FROM alpine:3.19
COPY --from=builder /stt-worker /stt-worker
CMD ["/stt-worker"]
```

**Step 3: Add to docker-compose.yml**

```yaml
  stt-worker:
    build:
      context: .
      dockerfile: cmd/stt-worker/Dockerfile
    environment:
      POSTGRES_DSN: postgres://app:devpassword@postgres:5432/aiplatform?sslmode=disable
      REDIS_ADDR: redis:6379
      RABBITMQ_URL: amqp://app:devpassword@rabbitmq:5672/
      STT_ENDPOINT: http://mock-stt:8081
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      mock-stt:
        condition: service_healthy
```

**Step 4: Commit**

```bash
git add cmd/stt-worker/ docker-compose.yml
git commit -m "feat: add STT worker with idempotency and retry logic"
```

---

## Task 7: LLM Worker

**Files:**
- Create: `cmd/llm-worker/main.go`
- Create: `cmd/llm-worker/Dockerfile`

**Step 1: Create LLM worker**

Create `cmd/llm-worker/main.go`:

```go
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

			// Idempotency check
			lockKey := fmt.Sprintf("lock:llm:%s", taskMsg.TaskID)
			ok, err := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
			if err != nil || !ok {
				log.Printf("Task %s already being processed, skipping", taskMsg.TaskID)
				msg.Ack(false)
				continue
			}

			// Get transcript from DB
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

			// Call mock LLM service
			summary, err := callLLM(cfg.LLMEndpoint, *task.Transcript)
			if err != nil {
				log.Printf("LLM call failed for task %s: %v", taskMsg.TaskID, err)
				repo.UpdateFailed(ctx, taskMsg.TaskID, err.Error())
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			// Update DB
			if err := repo.UpdateLLMResult(ctx, taskMsg.TaskID, summary); err != nil {
				log.Printf("DB update failed for task %s: %v", taskMsg.TaskID, err)
				rdb.Del(ctx, lockKey)
				msg.Nack(false, true)
				continue
			}

			// Invalidate cache
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
```

**Step 2: Create Dockerfile**

Create `cmd/llm-worker/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /llm-worker ./cmd/llm-worker

FROM alpine:3.19
COPY --from=builder /llm-worker /llm-worker
CMD ["/llm-worker"]
```

**Step 3: Add to docker-compose.yml**

```yaml
  llm-worker:
    build:
      context: .
      dockerfile: cmd/llm-worker/Dockerfile
    environment:
      POSTGRES_DSN: postgres://app:devpassword@postgres:5432/aiplatform?sslmode=disable
      REDIS_ADDR: redis:6379
      RABBITMQ_URL: amqp://app:devpassword@rabbitmq:5672/
      LLM_ENDPOINT: http://mock-llm:8082
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      mock-llm:
        condition: service_healthy
```

**Step 4: Commit**

```bash
git add cmd/llm-worker/ docker-compose.yml
git commit -m "feat: add LLM worker with idempotency and retry logic"
```

---

## Task 8: End-to-End Verification

**Step 1: Start all services**

```bash
docker compose up --build -d
docker compose ps  # verify all 7 services are running
```

**Step 2: Create a task via API**

```bash
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"audio_key": "uploads/test-audio-001.wav"}' | jq .
```

Expected output:
```json
{
  "task_id": "<uuid>",
  "status": "pending"
}
```

**Step 3: Wait a few seconds, then query the result**

```bash
# Replace <uuid> with the task_id from step 2
curl -s http://localhost:8080/api/v1/tasks/<uuid> | jq .
```

Expected: status should progress from `pending` → `stt_processing` → `llm_processing` → `done`, with `transcript` and `summary` populated.

**Step 4: List all tasks**

```bash
curl -s http://localhost:8080/api/v1/tasks | jq .
```

**Step 5: Check RabbitMQ management UI**

Open http://localhost:15672 (user: app, pass: devpassword) — verify queues exist and messages flow through.

**Step 6: Commit final docker-compose**

```bash
git add -A
git commit -m "feat: complete docker-compose prototype with all services"
```

---

## Task 9: ARCHITECTURE.md

**Files:**
- Create: `ARCHITECTURE.md`

**Step 1: Write the main deliverable document**

Take the content from `docs/plans/2026-03-02-ai-processing-platform-design.md` and format it as the final `ARCHITECTURE.md` at the project root. This is the primary interview deliverable. Ensure it includes:

1. Architecture diagrams (Mermaid format — renderable in GitHub)
2. Sequence diagram (Mermaid format)
3. Technical selection rationale
4. Architecture characteristics (scalability, fault tolerance, consistency, latency, security, observability)
5. Deployment topology and CI/CD
6. Architecture decision summary

Convert all ASCII diagrams to Mermaid syntax for cleaner rendering.

**Step 2: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md as primary interview deliverable"
```

---

## Task 10: README with Demo Instructions

**Files:**
- Create: `README.md`

**Step 1: Write README**

Include:
- Project overview (1 paragraph)
- Quick start instructions (`docker compose up --build`)
- API endpoints reference
- Architecture overview (link to ARCHITECTURE.md)
- Project structure

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with demo instructions"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffolding + infra docker-compose | None |
| 2 | Shared packages (model, config, queue) | Task 1 |
| 3 | Task repository (PostgreSQL) | Task 2 |
| 4 | Mock STT & LLM servers | Task 1 |
| 5 | API Service | Tasks 2, 3 |
| 6 | STT Worker | Tasks 2, 3, 4 |
| 7 | LLM Worker | Tasks 2, 3, 4 |
| 8 | End-to-end verification | Tasks 4-7 |
| 9 | ARCHITECTURE.md (primary deliverable) | Task 8 |
| 10 | README with demo instructions | Task 8 |
