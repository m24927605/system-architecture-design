# AI Processing Platform

可擴充的 AI 任務處理平台 -- 整合語音轉文字 (STT) 與 LLM 文字摘要，支援 2000+ 並發任務處理的事件驅動微服務架構。

> 詳細架構設計請參閱 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Start

```bash
# Build and start all services
docker compose up --build -d

# Verify all services are running
docker compose ps
```

### Try It

```bash
# 1. Create a task
curl -s -X POST http://localhost:18080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"audio_key": "uploads/test-audio-001.wav"}' | jq .

# Response: {"task_id": "<uuid>", "status": "pending"}

# 2. Wait a few seconds, then query the result
curl -s http://localhost:18080/api/v1/tasks/<task_id> | jq .

# 3. List all tasks
curl -s http://localhost:18080/api/v1/tasks | jq .
```

### Stop

```bash
docker compose down
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/tasks` | 建立新任務（提交音訊處理）|
| `GET` | `/api/v1/tasks/:id` | 查詢單一任務狀態與結果 |
| `GET` | `/api/v1/tasks` | 列出最近 50 筆任務 |
| `GET` | `/health` | Health check |

### Create Task Request

```json
{
  "audio_key": "uploads/test-audio-001.wav"
}
```

### Task Response

```json
{
  "id": "uuid",
  "status": "done",
  "audio_key": "uploads/test-audio-001.wav",
  "transcript": "Today we discussed the quarterly results...",
  "summary": "[AI Summary] Key points: ...",
  "retry_count": 0,
  "created_at": "2026-03-02T12:00:00Z",
  "updated_at": "2026-03-02T12:00:30Z"
}
```

---

## Project Structure

```
ai-processing-platform/
├── cmd/
│   ├── api/                    # API Service
│   ├── stt-worker/             # STT Worker
│   ├── llm-worker/             # LLM Worker
│   ├── mock-stt/               # Mock Whisper server (dev)
│   └── mock-llm/               # Mock vLLM server (dev)
├── internal/
│   ├── config/                 # Environment config
│   ├── handler/                # HTTP handlers
│   ├── model/                  # Domain models
│   ├── queue/                  # Message queue abstraction
│   └── repository/             # Database access layer
├── migrations/                 # SQL migrations
├── docker-compose.yml
├── Makefile
├── ARCHITECTURE.md             # Detailed architecture design
└── README.md
```

---

## Architecture Overview

```
User → API Service → SQS (STT Queue) → STT Worker → Whisper → SQS (LLM Queue) → LLM Worker → vLLM → Done
                ↕               ↕                                        ↕
           PostgreSQL        Redis                                  PostgreSQL
```

Tech stack: **Go** (all services) + **PostgreSQL** + **Redis** + **RabbitMQ** (local) / **SQS** (prod) + **Docker**

詳細架構說明、Mermaid 圖表、技術選型理由、部署策略請參閱 **[ARCHITECTURE.md](./ARCHITECTURE.md)**。
