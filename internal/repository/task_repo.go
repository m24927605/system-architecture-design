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
