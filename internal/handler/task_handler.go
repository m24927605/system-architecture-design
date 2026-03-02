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

	if task, err := h.getCachedTask(ctx, id); err == nil {
		return c.JSON(http.StatusOK, task)
	}

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
