export interface Trait {
  key: string;
  score: number; // 1-10
  summary: string;
  summaryZh: string;
  details: string[];
  detailsZh: string[];
}

export const traits: Trait[] = [
  {
    key: "scalability",
    score: 9,
    summary:
      "KEDA + Cluster Autoscaler for proactive, queue-depth-driven scaling",
    summaryZh:
      "KEDA + Cluster Autoscaler 實現主動式佇列深度驅動的擴展",
    details: [
      "KEDA scales workers based on SQS queue depth (proactive, not reactive)",
      "Cluster Autoscaler provisions GPU nodes when pods are unschedulable",
      "Spot + On-Demand GPU mix for cost optimization (40-60% savings)",
      "API pods scale via standard HPA on CPU utilization",
    ],
    detailsZh: [
      "KEDA 根據 SQS 佇列深度擴展 Worker（主動式，非反應式）",
      "Cluster Autoscaler 在 Pod 無法排程時擴展 GPU 節點",
      "Spot + On-Demand GPU 混合以優化成本（省 40-60%）",
      "API Pod 透過 HPA 根據 CPU 使用率擴展",
    ],
  },
  {
    key: "faultTolerance",
    score: 8,
    summary:
      "SQS visibility timeout + idempotent processing + circuit breaker",
    summaryZh: "SQS visibility timeout + 冪等處理 + 斷路器",
    details: [
      "SQS visibility timeout auto-redelivers on worker crash (5 min)",
      "Redis SETNX idempotency lock prevents duplicate processing",
      "Circuit breaker pattern for model server calls (50% error → open → 60s cooldown)",
      "DLQ captures permanently failed tasks for manual review",
    ],
    detailsZh: [
      "SQS visibility timeout 在 Worker 掛掉時自動重新投遞（5 分鐘）",
      "Redis SETNX 冪等鎖防止重複處理",
      "斷路器模式保護模型服務呼叫（50% 錯誤率 → 打開 → 60 秒冷卻）",
      "DLQ 捕獲永久失敗的任務供人工檢視",
    ],
  },
  {
    key: "consistency",
    score: 8,
    summary:
      "Write-then-ACK pattern with optimistic locking, no 2PC needed",
    summaryZh:
      "Write-then-ACK 模式搭配樂觀鎖，不需要 2PC",
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
  {
    key: "latency",
    score: 7,
    summary:
      "Async processing: API responds in <200ms, GPU processing 10-20s end-to-end",
    summaryZh:
      "非同步處理：API 回應 < 200ms，GPU 處理端到端 10-20 秒",
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
  {
    key: "security",
    score: 8,
    summary:
      "JWT + presigned URLs + VPC isolation + Secrets Manager",
    summaryZh:
      "JWT + Presigned URL + VPC 隔離 + Secrets Manager",
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
  {
    key: "observability",
    score: 9,
    summary:
      "Three pillars: Prometheus (metrics) + Loki (logs) + Tempo (traces), unified in Grafana",
    summaryZh:
      "三大支柱：Prometheus（指標）+ Loki（日誌）+ Tempo（追蹤），統一在 Grafana",
    details: [
      "trace_id propagates through SQS → workers → model servers",
      "Per-task timeline: API → queue wait → STT → LLM → DB write",
      "Alerting: DLQ > 0, error rate > 5%, P99 > threshold → PagerDuty",
      "GPU utilization, queue depth, cache hit ratio dashboards",
    ],
    detailsZh: [
      "trace_id 透過 SQS → Worker → Model Server 傳播",
      "每任務時間軸：API → 排隊等待 → STT → LLM → DB 寫入",
      "告警：DLQ > 0、錯誤率 > 5%、P99 超標 → PagerDuty",
      "GPU 使用率、佇列深度、快取命中率儀表板",
    ],
  },
  {
    key: "geoResilience",
    score: 7,
    summary:
      "Multi-AZ baseline + Multi-Region Active-Passive DR with RTO < 30 min",
    summaryZh:
      "Multi-AZ 基線 + 跨區域 Active-Passive DR，RTO < 30 分鐘",
    details: [
      "3-phase evolution: Single-AZ → Multi-AZ → Multi-Region Active-Passive (Pilot Light)",
      "Route 53 health-check failover routing between us-east-1 (primary) and us-west-2 (DR)",
      "RDS cross-region read replica with < 5 min RPO; promoted to primary on failover",
      "S3 Cross-Region Replication (CRR) + ECR replication for stateless DR readiness",
    ],
    detailsZh: [
      "三階段演進：Single-AZ → Multi-AZ → Multi-Region Active-Passive（Pilot Light）",
      "Route 53 健康檢查故障轉移路由：us-east-1（主）↔ us-west-2（DR）",
      "RDS 跨區域唯讀副本，RPO < 5 分鐘；故障轉移時提升為主資料庫",
      "S3 跨區域複寫（CRR）+ ECR 複寫，確保無狀態服務隨時可啟動",
    ],
  },
];
