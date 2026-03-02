# AI Processing Platform — System Architecture Design

## 1. 設計概要

設計一個可擴充、可維運的 AI 任務處理平台，整合語音轉文字（STT）、文字摘要（LLM）與結果查詢，支持 2000+ 並發任務處理。

**核心流程：** 使用者上傳音訊 → STT 轉文字 → LLM 摘要 → 儲存結果 → 查詢結果

**技術棧：** Go（全服務）+ AWS + Kubernetes + SQS + PostgreSQL + Redis

---

## 2. 系統架構圖

```
                            ┌─────────────────────────────────┐
                            │         CloudFront (CDN)         │
                            └──────────────┬──────────────────┘
                                           │
                            ┌──────────────▼──────────────────┐
                            │      ALB (Application LB)        │
                            └──────┬───────────────┬──────────┘
                                   │               │
                          ┌────────▼─────┐  ┌──────▼────────┐
                          │  Frontend    │  │  API Service   │
                          │  (S3 + CF)   │  │  (Go, EKS)    │
                          └──────────────┘  └──────┬────────┘
                                                   │
                          ┌────────────────────────▼────────────────────────┐
                          │              Amazon SQS                          │
                          │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
                          │  │ STT Queue│  │ LLM Queue│  │  DLQ (死信)   │  │
                          └──┴──────────┴──┴──────────┴──┴──────────────┴──┘
                                   │               │
                          ┌────────▼─────┐  ┌──────▼────────┐
                          │  STT Worker  │  │  LLM Worker   │
                          │  (Go, EKS)   │  │  (Go, EKS)    │
                          │  ×N replicas │  │  ×N replicas   │
                          └──────┬───────┘  └──────┬────────┘
                                 │                 │
                          ┌──────▼─────┐    ┌──────▼────────┐
                          │  Whisper   │    │   vLLM /      │
                          │  Server    │    │   TGI Server   │
                          │  (GPU Pod) │    │   (GPU Pod)    │
                          └────────────┘    └───────────────┘
                                   │               │
                          ┌────────▼───────────────▼────────┐
                          │          Data Layer              │
                          │  ┌──────────┐  ┌─────────────┐  │
                          │  │ PostgreSQL│  │  Amazon S3   │  │
                          │  │ (RDS)    │  │  (音訊/結果)  │  │
                          │  └──────────┘  └─────────────┘  │
                          │  ┌──────────┐                   │
                          │  │  Redis   │                   │
                          │  │(ElastiC.)│                   │
                          │  └──────────┘                   │
                          └─────────────────────────────────┘
                                         │
                          ┌──────────────▼──────────────────┐
                          │       Observability Stack        │
                          │  Prometheus + Grafana + Loki     │
                          │  OpenTelemetry + Tempo           │
                          │  PagerDuty / Slack (Alerting)    │
                          └─────────────────────────────────┘
```

### 各服務職責

| 服務 | 語言/技術 | 職責 |
|------|---------|------|
| **API Service** | Go (Echo) | 接收上傳、建立任務、查詢結果、WebSocket 通知 |
| **STT Worker** | Go | 消費 STT Queue，調用 Whisper Server API，回寫結果並發送到 LLM Queue |
| **LLM Worker** | Go | 消費 LLM Queue，調用 vLLM/TGI API，回寫最終摘要結果 |
| **Whisper Server** | faster-whisper (現成容器) | GPU Pod，提供 REST API 做語音轉文字 |
| **vLLM / TGI** | vLLM (現成容器) | GPU Pod，提供 REST API 做文字摘要 |
| **PostgreSQL (RDS)** | — | 任務元資料、狀態、結果文字 |
| **S3** | — | 原始音訊檔、大型結果檔案 |
| **Redis (ElastiCache)** | — | 任務狀態快取、rate limiting、冪等性檢查 |
| **SQS** | — | STT Queue + LLM Queue + DLQ，解耦任務、支持重試 |

---

## 3. 任務循序圖

```
User          Frontend       API Service      S3        SQS         STT Worker    Whisper     LLM Worker    vLLM       PostgreSQL    Redis
 │               │               │             │          │              │            │            │           │            │            │
 │──上傳音訊────▶│               │             │          │              │            │            │           │            │            │
 │               │──POST /tasks─▶│             │          │              │            │            │           │            │            │
 │               │               │──presigned──▶│         │              │            │            │           │            │            │
 │               │               │  upload URL │          │              │            │            │           │            │            │
 │               │               │◀────────────│          │              │            │            │           │            │            │
 │               │               │──INSERT task─────────────────────────────────────────────────────────────▶│            │
 │               │               │  (status=    │          │              │            │            │           │  pending)  │            │
 │               │               │──SET cache───────────────────────────────────────────────────────────────────────────▶│
 │               │               │──send msg───────────▶│              │            │            │           │            │            │
 │               │               │             │   STT Q  │              │            │            │           │            │            │
 │               │◀──task_id─────│             │          │              │            │            │           │            │            │
 │◀──轉跳結果頁──│               │             │          │              │            │            │           │            │            │
 │               │               │             │          │              │            │            │           │            │            │
 │               │               │             │          │──poll msg──▶│            │            │           │            │            │
 │               │               │             │          │              │──GET audio─▶│           │            │           │            │
 │               │               │             │          │              │  from S3   │            │           │            │            │
 │               │               │             │◀─────────────────────────│           │            │           │            │            │
 │               │               │             │          │              │──POST /transcribe──▶│  │            │           │            │
 │               │               │             │          │              │            │◀──text──│  │            │           │            │
 │               │               │             │          │              │──UPDATE status=stt_done──────────────────────▶│            │
 │               │               │             │          │              │──send msg to LLM Q──▶│ │            │           │            │
 │               │               │             │          │              │            │          │ │            │           │            │
 │               │               │             │          │              │            │          │──poll msg──▶│           │            │
 │               │               │             │          │              │            │          │  │──POST /summarize──▶│  │            │
 │               │               │             │          │              │            │          │  │           │◀─summary─│  │            │
 │               │               │             │          │              │            │          │  │──UPDATE status=done────▶│            │
 │               │               │             │          │              │            │          │  │──invalidate cache──────────────────▶│
 │               │               │             │          │              │            │            │           │            │            │
 │──GET /tasks/{id}──────────▶│             │          │              │            │            │           │            │            │
 │               │               │──check cache─────────────────────────────────────────────────────────────────────────▶│
 │               │               │◀─hit/miss───────────────────────────────────────────────────────────────────────────│
 │               │               │──(if miss) SELECT──────────────────────────────────────────────────────▶│            │
 │◀──結果────────│◀──response────│             │          │              │            │            │           │            │            │
```

### 任務狀態機

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
 ┌─────────┐    ┌──▼──────┐    ┌───────────┐    ┌──────────┐  │
 │ pending  │───▶│stt_proc │───▶│ llm_proc  │───▶│   done   │  │
 └─────────┘    └────┬────┘    └─────┬─────┘    └──────────┘  │
                     │               │                         │
                     │    fail       │    fail                  │
                     ▼               ▼                         │
                ┌─────────────────────────┐                    │
                │        failed           │──── retry ─────────┘
                │  (記錄 error + 重試次數) │
                └─────────────────────────┘
```

### 資料流說明

| 步驟 | 動作 | 資料存放 |
|------|------|--------|
| 1 | 使用者上傳音訊 | S3 (presigned URL 直傳，不經 API Server) |
| 2 | API Service 建立任務記錄 | PostgreSQL `tasks` 表 (status=pending) |
| 3 | 發送 STT 任務訊息 | SQS STT Queue |
| 4 | STT Worker 下載音訊、調用 Whisper | S3 → Whisper Server |
| 5 | 轉寫文字結果回寫 | PostgreSQL (transcript 欄位) |
| 6 | 發送 LLM 任務訊息 | SQS LLM Queue |
| 7 | LLM Worker 讀取 transcript、調用 vLLM | PostgreSQL → vLLM Server |
| 8 | 摘要結果回寫 | PostgreSQL (summary 欄位, status=done) |
| 9 | 使用者查詢結果 | Redis cache → PostgreSQL fallback |

### 關鍵設計決策

- **S3 Presigned URL 直傳**：音訊檔可能很大，避免經過 API Server 消耗頻寬和記憶體
- **兩段式 Queue**：STT 和 LLM 分開排隊，允許各自獨立擴展和重試
- **DLQ（死信佇列）**：重試超過 3 次的失敗任務進入 DLQ，觸發告警人工處理
- **冪等性**：Worker 用 Redis 記錄已處理的 message ID，避免重複處理

---

## 4. 技術選型與理由

### 程式語言與框架

| 技術 | 選擇 | 理由 |
|------|------|------|
| **API Service** | Go + Echo | Echo 輕量高效能，middleware 生態成熟（auth、CORS、rate limit），適合高並發 API |
| **Workers** | Go | goroutine 天然適合大量 I/O 等待（等 Whisper/vLLM 回應），記憶體佔用低，單 Pod 可處理大量並發任務 |
| **Frontend** | React + TypeScript | 題目重點不在前端，選主流框架即可，用 Vite 建構 |

### 雲端平台與服務

| 需求 | AWS 服務 | 理由 |
|------|---------|------|
| **容器編排** | EKS (Kubernetes) | 支持 GPU node group（給模型服務）、HPA 自動擴展、與 AWS 深度整合 |
| **訊息佇列** | SQS | 全託管、天然支持 DLQ 和 visibility timeout、不需維運 broker |
| **物件儲存** | S3 | 音訊檔存放，搭配 presigned URL 直傳，lifecycle policy 自動清理過期檔案 |
| **關聯式資料庫** | RDS PostgreSQL (Multi-AZ) | ACID 保證任務狀態一致性，Multi-AZ 自動容錯切換 |
| **快取** | ElastiCache Redis | 任務狀態快取、rate limiting、冪等性檢查 |
| **CDN** | CloudFront | 前端靜態資源加速 |
| **負載平衡** | ALB | Layer 7 路由、支持 WebSocket（任務進度推送）|
| **DNS** | Route 53 | 健康檢查 + failover routing |

### 為什麼選 SQS 而非 Kafka 或 RabbitMQ？

| 面向 | SQS | Kafka | RabbitMQ |
|------|-----|-------|----------|
| **運維成本** | 全託管，零運維 | 需管理集群或用 MSK（成本高）| 需自架或用 AmazonMQ |
| **場景適配** | 任務佇列（每條消息處理一次）| 事件流/日誌（需要回放）| 複雜路由（不需要）|
| **DLQ 支持** | 原生內建 | 需自行實作 | 原生支持 |
| **擴展性** | 自動，無上限 | 需預設 partition 數 | 需手動擴展 |

**結論**：場景是「任務佇列」而非「事件流」，每條消息處理一次就好，SQS 最匹配且零運維。

### 模型服務部署策略

| 模型 | 部署方式 | 具體方案 |
|------|---------|--------|
| **STT (Whisper)** | Container 模式 | faster-whisper-server 部署在 EKS GPU node (g5.xlarge)，提供 OpenAI-compatible API |
| **LLM (摘要)** | Container 模式 | vLLM 部署在 EKS GPU node (g5.2xlarge)，支持 continuous batching 最大化 GPU 利用率 |

**為何不用 AWS 託管 AI 服務（Transcribe / Bedrock）？**

| 面向 | 自架模型服務 | AWS 託管 AI 服務 |
|------|-----------|----------------|
| **成本** | 高並發時 GPU 實例更划算 | 按 API call 計費，2000+ 並發很貴 |
| **延遲** | 同 VPC 內調用，延遲 < 50ms | 走公網 API，延遲較高 |
| **可控性** | 可調模型版本、batch size、量化 | 黑盒，無法調整 |
| **離線能力** | 不依賴外部服務 | 完全依賴 AWS |

**取捨**：自架需管理 GPU 節點，但在 2000+ 並發規模下成本和效能優勢明顯。若初期規模小，可先用託管服務再漸進遷移。

### 資料庫 Schema（核心）

```sql
CREATE TABLE tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    audio_s3_key VARCHAR(512) NOT NULL,
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

---

## 5. 架構特性說明

### 5.1 可擴充性

**水平擴展策略：**

```
┌─────────────────────────────────┐
│     Kubernetes HPA 自動擴展      │
├─────────────────────────────────┤
│                                 │
│  API Service:                   │
│    metric: CPU > 70%            │
│    min: 3 pods, max: 20 pods    │
│                                 │
│  STT Worker:                    │
│    metric: SQS queue depth      │
│    min: 2 pods, max: 30 pods    │
│                                 │
│  LLM Worker:                    │
│    metric: SQS queue depth      │
│    min: 2 pods, max: 30 pods    │
│                                 │
│  Whisper Server (GPU):           │
│    metric: GPU utilization >80% │
│    min: 2 pods, max: 10 pods    │
│                                 │
│  vLLM Server (GPU):              │
│    metric: GPU utilization >80% │
│    min: 2 pods, max: 10 pods    │
└─────────────────────────────────┘
```

- **KEDA**：根據 SQS queue depth 自動調整 Worker 副本數
- **Cluster Autoscaler**：Pod 無法調度時自動新增 EC2 節點
- **GPU 節點**：EKS managed node group + Spot Instance 降低成本（搭配 On-Demand fallback）
- **RDS Read Replica**：查詢流量大時加 read replica 分流

**Plug-in 式任務擴展：**

```go
// 新增 AI 任務只需實作 TaskProcessor 介面
type TaskProcessor interface {
    ProcessTask(ctx context.Context, task *Task) (*TaskResult, error)
    QueueName() string
}

// 註冊新處理器即可，無需改動核心邏輯
registry.Register("stt", &STTProcessor{})
registry.Register("llm", &LLMProcessor{})
registry.Register("sentiment", &SentimentProcessor{})  // 未來新增
```

### 5.2 容錯性

| 故障場景 | 處理策略 |
|---------|--------|
| **Worker crash** | SQS visibility timeout 到期後自動重新投遞，另一個 Worker 接手 |
| **模型服務無回應** | Worker 設定 timeout + exponential backoff 重試（最多 3 次）|
| **重試耗盡** | 訊息進入 DLQ，觸發 CloudWatch Alarm → PagerDuty 告警 |
| **PostgreSQL 主節點掛掉** | RDS Multi-AZ 自動 failover（< 60 秒）|
| **Redis 掛掉** | ElastiCache Multi-AZ，failover 自動切換；cache miss 時 fallback 到 DB |
| **整個 AZ 掛掉** | EKS Pod 分佈在多 AZ，ALB 自動繞過不健康的 AZ |
| **API Service 掛掉** | K8s liveness/readiness probe 自動重啟，ALB 健康檢查剔除不健康實例 |

**關鍵機制：**

- **SQS Visibility Timeout**：設為任務最長處理時間的 2 倍（例如 STT 任務預估 2 分鐘，timeout 設 4 分鐘）
- **冪等處理**：Worker 用 Redis `SETNX` 鎖定 task_id，確保同一任務不被重複處理
- **Circuit Breaker**：Worker 對模型服務的調用加入熔斷器，錯誤率 > 50% 時暫停請求，避免雪崩

### 5.3 資料一致性

```
Worker 處理流程（保證一致性）：

  ┌──────────┐     ┌──────────────┐     ┌──────────┐
  │ 1. 收到   │────▶│ 2. Redis     │────▶│ 3. 調用  │
  │ SQS 消息  │     │ SETNX 去重   │     │ 模型服務  │
  └──────────┘     └──────┬───────┘     └────┬─────┘
                          │ 已存在              │
                          ▼                    ▼
                    ┌──────────┐        ┌──────────┐
                    │ ACK 消息  │        │ 4. DB    │
                    │ 直接跳過  │        │ 寫入結果  │
                    └──────────┘        └────┬─────┘
                                             │
                                       ┌─────▼─────┐
                                       │ 5. ACK    │
                                       │ SQS 消息   │
                                       └───────────┘
```

- **先寫 DB，後 ACK 消息**：確保結果已持久化才確認消息
- **冪等機制**：若 Worker 在寫 DB 後、ACK 前 crash，消息會重新投遞，但冪等機制保證不會重複寫入
- **DB 事務**：狀態更新和結果寫入在同一個 transaction 內

### 5.4 延遲與效能

| 策略 | 說明 |
|------|------|
| **非同步處理 + WebSocket** | 上傳後立即回傳 task_id，透過 WebSocket 即時推送進度 |
| **S3 Presigned URL 直傳** | 音訊檔不經 API Server，直接傳到 S3 |
| **vLLM Continuous Batching** | 多個 LLM 請求動態批次處理，throughput 提升 3-5 倍 |
| **Redis 結果快取** | 查詢結果命中快取時 < 5ms 回應 |
| **連線池** | Go Worker 對 DB、Redis、模型服務都維持連線池 |

**預估延遲：**

- 上傳 → 收到 task_id：< 200ms
- STT 處理（1 分鐘音訊）：~10-30 秒
- LLM 摘要：~5-15 秒
- 查詢結果：< 50ms（cache hit）

### 5.5 安全性

| 層級 | 措施 |
|------|------|
| **API 認證** | JWT token（短期）+ API Key（服務間），middleware 統一驗證 |
| **S3 存取** | Presigned URL 有效期 15 分鐘，bucket policy 禁止公開存取 |
| **傳輸加密** | 全鏈路 HTTPS/TLS，ALB 終止 TLS |
| **靜態加密** | S3 SSE-S3 加密、RDS storage encryption |
| **網路隔離** | 模型服務和 DB 在 private subnet，僅 Worker 可存取 |
| **Rate Limiting** | Redis-based sliding window，API 層限流（100 req/min per user）|
| **檔案驗證** | 驗證上傳檔案 MIME type 和大小上限（500MB）|
| **Secrets** | AWS Secrets Manager 管理 DB 密碼、API Key |

### 5.6 可觀測性

```
┌─────────────────────────────────────────────────────────┐
│                 Observability Stack                      │
│                                                         │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │   Metrics    │  │   Logs   │  │  Distributed Trace │  │
│  │ Prometheus   │  │   Loki   │  │  OpenTelemetry     │  │
│  │ + Grafana    │  │+ Grafana │  │  + Tempo           │  │
│  └──────┬──────┘  └────┬─────┘  └─────────┬──────────┘  │
│         └──────────────┼──────────────────┘              │
│                        ▼                                 │
│              ┌──────────────────┐                        │
│              │    Grafana        │                        │
│              │  (統一 Dashboard) │                        │
│              └────────┬─────────┘                        │
│                       ▼                                  │
│              ┌──────────────────┐                        │
│              │   Alerting       │                        │
│              │  Grafana Alert   │                        │
│              │  → PagerDuty     │                        │
│              │  → Slack         │                        │
│              └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

| 觀測面向 | 工具 | 關鍵指標 |
|---------|------|--------|
| **Metrics** | Prometheus + Grafana | 任務處理速率、佇列深度、API P95/P99 延遲、GPU 利用率、錯誤率 |
| **Logs** | Loki (結構化 JSON log) | 每個任務的完整處理鏈路、錯誤詳情 |
| **Traces** | OpenTelemetry + Tempo | 每個任務全鏈路追蹤（API → Queue → Worker → 模型），含 trace_id |
| **Alerting** | Grafana Alerting | DLQ 有消息、錯誤率 > 5%、P99 延遲 > 閾值、GPU 節點不可用 |

**任務級追蹤**：每個 task 綁定 `trace_id`，可在 Grafana 用 task_id 一鍵查詢完整鏈路。

---

## 6. 維運與部署

### 部署拓樸圖

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AWS Organization                              │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │   Dev Account     │  │ Staging Account   │  │  Prod Account      │  │
│  │                   │  │                   │  │                    │  │
│  │  EKS (1 node)    │  │  EKS (3 nodes)   │  │  EKS (6+ nodes)   │  │
│  │  RDS (single)    │  │  RDS (single)    │  │  RDS (Multi-AZ)   │  │
│  │  Redis (single)  │  │  Redis (single)  │  │  Redis (cluster)  │  │
│  │  GPU: 0 (mock)   │  │  GPU: 1 node     │  │  GPU: 4+ nodes    │  │
│  │                   │  │                   │  │                    │  │
│  │  用途：            │  │  用途：            │  │  用途：             │  │
│  │  本地開發聯調      │  │  整合/效能測試     │  │  正式環境           │  │
│  │  Mock 模型服務     │  │  與 Prod 同架構    │  │  Multi-AZ 部署     │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Shared Services Account                       │ │
│  │  ECR (容器映像) │ Grafana │ Terraform State (S3) │ Secrets Mgr  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### CI/CD 流程

```
 Developer        GitHub           GitHub Actions        ECR          ArgoCD         EKS
    │                │                   │                 │              │             │
    │──push branch──▶│──trigger CI──────▶│                 │              │             │
    │                │          ┌────────┴────────┐        │              │             │
    │                │          │   CI Pipeline    │        │              │             │
    │                │          │  1. lint          │        │              │             │
    │                │          │  2. unit test    │        │              │             │
    │                │          │  3. build        │        │              │             │
    │                │          │  4. security scan│        │              │             │
    │                │          └────────┬────────┘        │              │             │
    │──open PR──────▶│──trigger──────────▶                 │              │             │
    │                │          ┌────────┴────────┐        │              │             │
    │                │          │  5. integration  │        │              │             │
    │                │          │     test         │        │              │             │
    │                │          │  6. build image  │───push──▶            │             │
    │                │          └─────────────────┘        │              │             │
    │──merge to main─▶──trigger CD──────────────────────────────────────▶│             │
    │                │                                     │     ┌────────┴──────┐      │
    │                │                                     │     │  ArgoCD       │      │
    │                │                                     │     │  7. update    │      │
    │                │                                     │     │     manifest  │      │
    │                │                                     │     │  8. → Staging │──deploy──▶
    │                │                                     │     │  9. approve   │      │
    │                │                                     │     │     → Prod    │──deploy──▶
    │                │                                     │     └───────────────┘  (canary)
```

| 階段 | 觸發條件 | 動作 |
|------|---------|------|
| **CI** | push any branch | lint → unit test → build → security scan (Trivy) |
| **PR Check** | open/update PR | integration test（docker-compose 啟動完整服務 + mock 模型）|
| **CD to Staging** | merge to `main` | 自動 build image → push ECR → ArgoCD 同步到 Staging |
| **CD to Prod** | Staging 驗證通過 | 手動 approve → ArgoCD Canary 部署到 Prod |

### 部署策略與 Rollback

**Canary 部署（Prod）：**

```
Phase 1:  [████ 10%] [████████████████████████████████████ 90%]
           ↓ 監控 5 分鐘，錯誤率 < 1%
Phase 2:  [████████████ 30%] [████████████████████████████ 70%]
           ↓ 監控 5 分鐘，錯誤率 < 1%
Phase 3:  [██████████████████████████████████████████ 100%]
```

- 使用 **Argo Rollouts** 實現自動化 canary
- 每階段自動檢查 Prometheus 指標，不通過自動 rollback

**Rollback：**

| 場景 | 操作 |
|------|------|
| **Canary 階段問題** | Argo Rollouts 自動回滾，零人工介入 |
| **上線後問題** | `kubectl argo rollouts undo` 或 ArgoCD UI revert |
| **DB migration 回滾** | 每個 migration 附帶 down migration |
| **緊急回滾** | ArgoCD sync 到指定 Git commit hash |

**關鍵原則：**

- GitOps：ArgoCD 以 Git repo 為 single source of truth
- 容器映像用 immutable tag（Git SHA）
- DB migration 與應用部署分離，migration 必須向後兼容

---

## 7. 架構決策摘要

| 決策 | 選擇 | 替代方案 | 理由 |
|------|------|---------|------|
| 全 Go 技術棧 | Go API + Go Workers | 混合 Go + Python | 模型服務獨立部署，Worker 只做 HTTP 調用，Go 並發優勢最大化 |
| SQS 作為消息佇列 | Amazon SQS | Kafka / RabbitMQ | 任務佇列場景，SQS 全託管零運維，內建 DLQ |
| 自架模型服務 | faster-whisper + vLLM | AWS Transcribe + Bedrock | 2000+ 並發下成本和延遲優勢明顯 |
| EKS 容器編排 | Amazon EKS | ECS / 自架 K8s | GPU node group 支持、HPA/KEDA 生態、業界標準 |
| Canary 部署 | Argo Rollouts | Blue-Green / Rolling | 漸進式驗證，自動回滾風險最低 |
| GitOps | ArgoCD | Jenkins CD / Flux | 聲明式部署、Git 為 single source of truth、回滾便捷 |
