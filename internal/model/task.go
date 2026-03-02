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
