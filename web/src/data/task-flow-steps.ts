export interface FlowStep {
  id: number;
  actor: string;
  action: string;
  target: string;
  detail: string;
  color: string;
  actorZh: string;
  actionZh: string;
  targetZh: string;
  detailZh: string;
}

export const flowSteps: FlowStep[] = [
  {
    id: 1,
    actor: "User",
    action: "POST /tasks",
    target: "API Service",
    detail: "Upload audio file, receive task_id immediately (< 200ms)",
    color: "text-text-secondary",
    actorZh: "使用者",
    actionZh: "POST /tasks",
    targetZh: "API 服務",
    detailZh: "上傳音檔，立即收到 task_id（< 200ms）",
  },
  {
    id: 2,
    actor: "API",
    action: "Presigned URL",
    target: "S3",
    detail: "Audio uploads directly to S3, bypassing API server",
    color: "text-accent-start",
    actorZh: "API",
    actionZh: "Presigned URL",
    targetZh: "S3",
    detailZh: "音檔直傳 S3，不經 API 伺服器",
  },
  {
    id: 3,
    actor: "API",
    action: "INSERT task",
    target: "PostgreSQL",
    detail: "Create task record with status=pending",
    color: "text-accent-start",
    actorZh: "API",
    actionZh: "INSERT 任務",
    targetZh: "PostgreSQL",
    detailZh: "建立任務記錄，status=pending",
  },
  {
    id: 4,
    actor: "API",
    action: "Send message",
    target: "SQS (STT Queue)",
    detail: "Enqueue STT task, decoupling ingestion from processing",
    color: "text-warning",
    actorZh: "API",
    actionZh: "發送訊息",
    targetZh: "SQS (STT 佇列)",
    detailZh: "將 STT 任務入列，解耦接收與處理",
  },
  {
    id: 5,
    actor: "STT Worker",
    action: "Call model",
    target: "Whisper / Transcribe",
    detail:
      "GPU inference ~5-10s per 1-min audio. Redis SETNX for idempotency.",
    color: "text-cyan",
    actorZh: "STT Worker",
    actionZh: "呼叫模型",
    targetZh: "Whisper / Transcribe",
    detailZh: "GPU 推理 ~5-10 秒/分鐘音檔，Redis SETNX 冪等鎖",
  },
  {
    id: 6,
    actor: "STT Worker",
    action: "UPDATE + enqueue",
    target: "DB → SQS (LLM Queue)",
    detail:
      "Write transcript to DB, then send to LLM queue (Write-then-ACK)",
    color: "text-cyan",
    actorZh: "STT Worker",
    actionZh: "更新 + 入列",
    targetZh: "DB → SQS (LLM 佇列)",
    detailZh: "寫入 transcript 到 DB，再發送到 LLM 佇列（Write-then-ACK）",
  },
  {
    id: 7,
    actor: "LLM Worker",
    action: "Call model",
    target: "vLLM / Bedrock",
    detail: "Summarization ~2-5s with continuous batching",
    color: "text-accent-end",
    actorZh: "LLM Worker",
    actionZh: "呼叫模型",
    targetZh: "vLLM / Bedrock",
    detailZh: "摘要 ~2-5 秒，連續批次處理",
  },
  {
    id: 8,
    actor: "LLM Worker",
    action: "UPDATE status=done",
    target: "PostgreSQL",
    detail:
      "Write summary, set status=done, invalidate Redis cache",
    color: "text-accent-end",
    actorZh: "LLM Worker",
    actionZh: "更新 status=done",
    targetZh: "PostgreSQL",
    detailZh: "寫入摘要，設定 status=done，清除 Redis 快取",
  },
  {
    id: 9,
    actor: "User",
    action: "GET /tasks/{id}",
    target: "API → Redis/DB",
    detail:
      "Cache hit: < 5ms. Cache miss: < 50ms (DB fallback)",
    color: "text-text-secondary",
    actorZh: "使用者",
    actionZh: "GET /tasks/{id}",
    targetZh: "API → Redis/DB",
    detailZh: "快取命中：< 5ms，未命中：< 50ms（DB 回退）",
  },
];
