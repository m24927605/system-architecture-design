export type PhaseKey = "phase1" | "phase2" | "phase3";

export interface PhaseTrait {
  score: number; // 1-10
  summary: string;
  summaryZh: string;
  details: string[];
  detailsZh: string[];
}

export interface Trait {
  key: string;
  phases: Record<PhaseKey, PhaseTrait>;
}

export const traits: Trait[] = [
  {
    key: "scalability",
    phases: {
      phase1: {
        score: 4,
        summary: "Single ECS service with manual scaling, adequate for <50K tasks/month",
        summaryZh: "單一 ECS 服務手動擴展，足以應付 <50K tasks/月",
        details: [
          "ECS Fargate auto-scaling based on CPU/memory thresholds",
          "Single SQS queue with basic consumer scaling",
          "No GPU node management — using managed AWS Transcribe + Bedrock",
          "Vertical scaling only (larger task size = larger Fargate task)",
        ],
        detailsZh: [
          "ECS Fargate 根據 CPU/記憶體閾值自動擴展",
          "單一 SQS 佇列搭配基本消費者擴展",
          "無需管理 GPU 節點 — 使用託管 AWS Transcribe + Bedrock",
          "僅支援垂直擴展（更大任務 = 更大 Fargate 實例）",
        ],
      },
      phase2: {
        score: 7,
        summary: "EKS + HPA with queue-depth scaling, self-hosted GPU nodes",
        summaryZh: "EKS + HPA 佇列深度擴展，自建 GPU 節點",
        details: [
          "Kubernetes HPA scales API pods on CPU utilization",
          "SQS-based worker scaling: monitor ApproximateNumberOfMessages",
          "Cluster Autoscaler adds GPU nodes when pods pending",
          "Spot instances for non-critical workloads (g5.xlarge ~60-70% savings)",
        ],
        detailsZh: [
          "Kubernetes HPA 根據 CPU 使用率擴展 API Pod",
          "SQS Worker 擴展：監控 ApproximateNumberOfMessages",
          "Cluster Autoscaler 在 Pod pending 時新增 GPU 節點",
          "非關鍵工作使用 Spot 實例（g5.xlarge 省約 60-70%）",
        ],
      },
      phase3: {
        score: 9,
        summary: "KEDA + Cluster Autoscaler for proactive, queue-depth-driven scaling",
        summaryZh: "KEDA + Cluster Autoscaler 實現主動式佇列深度驅動的擴展",
        details: [
          "KEDA scales workers based on SQS queue depth (proactive, not reactive)",
          "Cluster Autoscaler provisions GPU nodes when pods are unschedulable",
          "Spot + On-Demand GPU mix for cost optimization (g5.xlarge Spot ~60-70% off On-Demand)",
          "API pods scale via standard HPA on CPU utilization",
        ],
        detailsZh: [
          "KEDA 根據 SQS 佇列深度擴展 Worker（主動式，非反應式）",
          "Cluster Autoscaler 在 Pod 無法排程時擴展 GPU 節點",
          "Spot + On-Demand GPU 混合以優化成本（g5.xlarge Spot 約省 60-70%）",
          "API Pod 透過 HPA 根據 CPU 使用率擴展",
        ],
      },
    },
  },
  {
    key: "faultTolerance",
    phases: {
      phase1: {
        score: 4,
        summary: "Basic SQS retry with DLQ, no circuit breaker or idempotency lock",
        summaryZh: "基本 SQS 重試 + DLQ，無斷路器或冪等鎖",
        details: [
          "SQS message retry (maxReceiveCount = 3) before moving to DLQ",
          "Managed services handle their own fault tolerance (Transcribe, Bedrock)",
          "No explicit idempotency — relies on DB unique constraints",
          "Single-AZ deployment: AZ failure = full outage",
        ],
        detailsZh: [
          "SQS 訊息重試（maxReceiveCount = 3）失敗後移至 DLQ",
          "託管服務自行處理容錯（Transcribe、Bedrock）",
          "無顯式冪等 — 依賴 DB unique constraint",
          "單 AZ 部署：AZ 故障 = 全面中斷",
        ],
      },
      phase2: {
        score: 7,
        summary: "SQS visibility timeout + Redis idempotency lock + DLQ monitoring",
        summaryZh: "SQS visibility timeout + Redis 冪等鎖 + DLQ 監控",
        details: [
          "SQS visibility timeout auto-redelivers on worker crash (5 min)",
          "Redis SETNX idempotency lock prevents duplicate processing",
          "DLQ with CloudWatch alarm for failed task alerting",
          "Multi-AZ RDS and ElastiCache for database-level fault tolerance",
        ],
        detailsZh: [
          "SQS visibility timeout 在 Worker 掛掉時自動重新投遞（5 分鐘）",
          "Redis SETNX 冪等鎖防止重複處理",
          "DLQ 搭配 CloudWatch 警報監控失敗任務",
          "Multi-AZ RDS 和 ElastiCache 提供資料庫層容錯",
        ],
      },
      phase3: {
        score: 8,
        summary: "SQS visibility timeout + idempotent processing + circuit breaker",
        summaryZh: "SQS visibility timeout + 冪等處理 + 斷路器",
        details: [
          "SQS visibility timeout auto-redelivers on worker crash (5 min)",
          "Redis SETNX idempotency lock prevents duplicate processing",
          "Circuit breaker pattern for model server calls (50% error -> open -> 60s cooldown)",
          "DLQ captures permanently failed tasks for manual review",
        ],
        detailsZh: [
          "SQS visibility timeout 在 Worker 掛掉時自動重新投遞（5 分鐘）",
          "Redis SETNX 冪等鎖防止重複處理",
          "斷路器模式保護模型服務呼叫（50% 錯誤率 -> 打開 -> 60 秒冷卻）",
          "DLQ 捕獲永久失敗的任務供人工檢視",
        ],
      },
    },
  },
  {
    key: "consistency",
    phases: {
      phase1: {
        score: 6,
        summary: "Simple DB write-before-ACK pattern, no explicit deduplication",
        summaryZh: "簡單 DB 先寫後 ACK 模式，無顯式去重",
        details: [
          "Write result to DB before deleting SQS message (crash-safe)",
          "DB unique constraint on task_id prevents duplicate rows",
          "No optimistic locking — low concurrency makes conflicts unlikely",
          "Eventual consistency acceptable for async processing pipeline",
        ],
        detailsZh: [
          "先寫入 DB 再刪除 SQS 訊息（crash-safe）",
          "DB 對 task_id 的 unique constraint 防止重複資料列",
          "無樂觀鎖 — 低並發下衝突不太可能發生",
          "非同步處理管線可接受最終一致性",
        ],
      },
      phase2: {
        score: 7,
        summary: "Write-then-ACK with Redis dedup lock, optimistic locking for status updates",
        summaryZh: "Write-then-ACK + Redis 去重鎖，狀態更新使用樂觀鎖",
        details: [
          "Write result to DB before ACKing SQS message (crash-safe)",
          "Redis idempotency lock as first-line dedup with TTL",
          "Optimistic lock via WHERE status = 'expected_state' for concurrent updates",
          "DB status check as fallback dedup when Redis lock expires",
        ],
        detailsZh: [
          "先寫入 DB 再 ACK SQS 訊息（crash-safe）",
          "Redis 冪等鎖作為第一層去重（有 TTL）",
          "透過 WHERE status = 'expected_state' 實現樂觀鎖處理並發更新",
          "DB 狀態檢查作為 Redis 鎖過期時的備援去重",
        ],
      },
      phase3: {
        score: 8,
        summary: "Write-then-ACK pattern with optimistic locking, no 2PC needed",
        summaryZh: "Write-then-ACK 模式搭配樂觀鎖，不需要 2PC",
        details: [
          "Write result to DB before ACKing SQS message (crash-safe)",
          "Optimistic lock via WHERE status = 'expected_state' (zero lock contention)",
          "Redis idempotency lock as first-line dedup with TTL",
          "DB status check as second-line dedup (when Redis lock expires)",
        ],
        detailsZh: [
          "先寫入 DB 再 ACK SQS 訊息（crash-safe）",
          "透過 WHERE status = 'expected_state' 實現樂觀鎖（零鎖競爭）",
          "Redis 冪等鎖作為第一層去重（有 TTL）",
          "DB 狀態檢查作為第二層去重（Redis 鎖過期時）",
        ],
      },
    },
  },
  {
    key: "latency",
    phases: {
      phase1: {
        score: 6,
        summary: "Async processing: API responds in <200ms, managed services handle GPU inference",
        summaryZh: "非同步處理：API 回應 < 200ms，託管服務處理 GPU 推論",
        details: [
          "API returns task_id immediately, never blocked by AI processing",
          "S3 presigned URL: audio bypasses API server entirely",
          "AWS Transcribe + Bedrock: no cold start management needed",
          "No caching layer — acceptable at low volume",
        ],
        detailsZh: [
          "API 立即回傳 task_id，永遠不被 AI 處理阻塞",
          "S3 presigned URL：音檔完全繞過 API 伺服器",
          "AWS Transcribe + Bedrock：不需管理冷啟動",
          "無快取層 — 低量級下可接受",
        ],
      },
      phase2: {
        score: 7,
        summary: "Self-hosted GPU with vLLM batching + Redis cache for query results",
        summaryZh: "自建 GPU 搭配 vLLM 批次處理 + Redis 快取查詢結果",
        details: [
          "API returns task_id immediately, never blocked by GPU",
          "S3 presigned URL: audio bypasses API server entirely",
          "vLLM continuous batching: 3-5x throughput improvement",
          "Redis cache: query result in < 5ms on cache hit",
        ],
        detailsZh: [
          "API 立即回傳 task_id，永遠不被 GPU 阻塞",
          "S3 presigned URL：音檔完全繞過 API 伺服器",
          "vLLM 連續批次處理：吞吐量提升 3-5 倍",
          "Redis 快取：快取命中時查詢延遲 < 5ms",
        ],
      },
      phase3: {
        score: 7,
        summary: "Async processing: API responds in <200ms, GPU processing 10-20s end-to-end",
        summaryZh: "非同步處理：API 回應 < 200ms，GPU 處理端到端 10-20 秒",
        details: [
          "API returns task_id immediately, never blocked by GPU",
          "S3 presigned URL: audio bypasses API server entirely",
          "vLLM continuous batching: 3-5x throughput improvement",
          "Redis cache: query result in < 5ms on cache hit",
        ],
        detailsZh: [
          "API 立即回傳 task_id，永遠不被 GPU 阻塞",
          "S3 presigned URL：音檔完全繞過 API 伺服器",
          "vLLM 連續批次處理：吞吐量提升 3-5 倍",
          "Redis 快取：快取命中時查詢延遲 < 5ms",
        ],
      },
    },
  },
  {
    key: "security",
    phases: {
      phase1: {
        score: 5,
        summary: "API key authentication + S3 presigned URLs + basic VPC",
        summaryZh: "API Key 認證 + S3 Presigned URL + 基本 VPC",
        details: [
          "API key authentication for client access",
          "S3 presigned URLs (15-min expiry) for audio upload",
          "Default VPC with security groups for network isolation",
          "Environment variables for secrets (migrated to Secrets Manager later)",
        ],
        detailsZh: [
          "API Key 認證客戶端存取",
          "S3 presigned URL（15 分鐘有效期）用於音檔上傳",
          "預設 VPC + Security Group 進行網路隔離",
          "環境變數存放密鑰（後續遷移至 Secrets Manager）",
        ],
      },
      phase2: {
        score: 7,
        summary: "JWT tokens + presigned URLs + VPC private subnets + Secrets Manager",
        summaryZh: "JWT + Presigned URL + VPC 私有子網 + Secrets Manager",
        details: [
          "JWT tokens (short-lived) for user authentication",
          "S3 presigned URLs (15-min expiry), bucket denies all public access",
          "VPC private subnets: GPUs, DB, Redis not publicly exposed",
          "AWS Secrets Manager for credentials, injected via K8s CSI driver",
        ],
        detailsZh: [
          "JWT（短期）用於使用者認證",
          "S3 presigned URL（15 分鐘有效期），bucket 禁止所有公開存取",
          "VPC 私有子網：GPU、DB、Redis 不暴露在公網",
          "AWS Secrets Manager 管理憑證，透過 K8s CSI Driver 注入",
        ],
      },
      phase3: {
        score: 8,
        summary: "JWT + presigned URLs + VPC isolation + Secrets Manager + WAF",
        summaryZh: "JWT + Presigned URL + VPC 隔離 + Secrets Manager + WAF",
        details: [
          "JWT tokens (short-lived) + API keys for service-to-service",
          "S3 presigned URLs (15-min expiry), bucket denies all public access",
          "VPC private subnets: GPUs, DB, Redis never exposed publicly",
          "AWS Secrets Manager with EKS CSI driver injection",
        ],
        detailsZh: [
          "JWT（短期）+ API Key 用於服務間通訊",
          "S3 presigned URL（15 分鐘有效期），bucket 禁止所有公開存取",
          "VPC 私有子網：GPU、DB、Redis 永不暴露在公網",
          "AWS Secrets Manager 透過 EKS CSI Driver 注入",
        ],
      },
    },
  },
  {
    key: "observability",
    phases: {
      phase1: {
        score: 3,
        summary: "CloudWatch metrics + basic alarms, no distributed tracing",
        summaryZh: "CloudWatch 指標 + 基本警報，無分散式追蹤",
        details: [
          "CloudWatch Logs for application logging",
          "CloudWatch Metrics for basic service health (CPU, memory, error rate)",
          "CloudWatch Alarms for critical thresholds (DLQ > 0, error rate > 5%)",
          "No distributed tracing — acceptable at MVP scale",
        ],
        detailsZh: [
          "CloudWatch Logs 用於應用程式日誌",
          "CloudWatch Metrics 監控基本服務健康（CPU、記憶體、錯誤率）",
          "CloudWatch Alarms 設定關鍵閾值警報（DLQ > 0、錯誤率 > 5%）",
          "無分散式追蹤 — MVP 規模下可接受",
        ],
      },
      phase2: {
        score: 7,
        summary: "Prometheus + Grafana for metrics, structured logging, basic tracing",
        summaryZh: "Prometheus + Grafana 指標監控，結構化日誌，基本追蹤",
        details: [
          "Prometheus scrapes custom metrics (queue depth, GPU utilization, task latency)",
          "Grafana dashboards for real-time monitoring",
          "Structured JSON logging with correlation IDs",
          "OpenTelemetry SDK for basic request tracing across services",
        ],
        detailsZh: [
          "Prometheus 抓取自訂指標（佇列深度、GPU 使用率、任務延遲）",
          "Grafana 儀表板即時監控",
          "結構化 JSON 日誌搭配關聯 ID",
          "OpenTelemetry SDK 基本的跨服務請求追蹤",
        ],
      },
      phase3: {
        score: 9,
        summary: "Three pillars: Prometheus (metrics) + Loki (logs) + Tempo (traces), unified in Grafana",
        summaryZh: "三大支柱：Prometheus（指標）+ Loki（日誌）+ Tempo（追蹤），統一在 Grafana",
        details: [
          "trace_id propagates through SQS -> workers -> model servers",
          "Per-task timeline: API -> queue wait -> STT -> LLM -> DB write",
          "Alerting: DLQ > 0, error rate > 5%, P99 > threshold -> PagerDuty",
          "GPU utilization, queue depth, cache hit ratio dashboards",
        ],
        detailsZh: [
          "trace_id 透過 SQS -> Worker -> Model Server 傳播",
          "每任務時間軸：API -> 排隊等待 -> STT -> LLM -> DB 寫入",
          "警報：DLQ > 0、錯誤率 > 5%、P99 超標 -> PagerDuty",
          "GPU 使用率、佇列深度、快取命中率儀表板",
        ],
      },
    },
  },
  {
    key: "geoResilience",
    phases: {
      phase1: {
        score: 2,
        summary: "Single-AZ deployment, no redundancy beyond managed service SLAs",
        summaryZh: "單 AZ 部署，僅依賴託管服務 SLA 保障",
        details: [
          "Single Availability Zone deployment",
          "RDS Single-AZ (no automatic failover)",
          "S3 provides built-in 11 nines durability across AZs",
          "AZ failure = full service outage, manual recovery required",
        ],
        detailsZh: [
          "單一可用區部署",
          "RDS 單 AZ（無自動故障轉移）",
          "S3 內建跨 AZ 11 個 9 的耐久性",
          "AZ 故障 = 服務完全中斷，需人工復原",
        ],
      },
      phase2: {
        score: 5,
        summary: "Multi-AZ deployment for all stateful services",
        summaryZh: "所有有狀態服務 Multi-AZ 部署",
        details: [
          "EKS worker nodes spread across 3 AZs",
          "RDS Multi-AZ with automatic failover (< 60s)",
          "ElastiCache Multi-AZ with automatic replica promotion",
          "Single region — no cross-region disaster recovery",
        ],
        detailsZh: [
          "EKS Worker 節點分佈在 3 個 AZ",
          "RDS Multi-AZ 自動故障轉移（< 60 秒）",
          "ElastiCache Multi-AZ 自動副本提升",
          "單區域 — 無跨區域災難復原",
        ],
      },
      phase3: {
        score: 7,
        summary: "Multi-AZ baseline + Multi-Region Active-Passive DR with RTO < 30 min",
        summaryZh: "Multi-AZ 基線 + 跨區域 Active-Passive DR，RTO < 30 分鐘",
        details: [
          "3-phase evolution: Single-AZ -> Multi-AZ -> Multi-Region Active-Passive (Pilot Light)",
          "Route 53 health-check failover routing between us-east-1 (primary) and us-west-2 (DR)",
          "RDS cross-region read replica with < 5 min RPO; promoted to primary on failover",
          "S3 Cross-Region Replication (CRR) + ECR replication for stateless DR readiness",
        ],
        detailsZh: [
          "三階段演進：Single-AZ -> Multi-AZ -> Multi-Region Active-Passive（Pilot Light）",
          "Route 53 健康檢查故障轉移路由：us-east-1（主）↔ us-west-2（DR）",
          "RDS 跨區域唯讀副本，RPO < 5 分鐘；故障轉移時提升為主資料庫",
          "S3 跨區域複寫（CRR）+ ECR 複寫，確保無狀態服務隨時可啟動",
        ],
      },
    },
  },
];
