export type Phase = 1 | 2 | 3;

export interface PhaseChoice {
  phase: Phase;
  chosen: string;
  rationale: string;
  rationaleZh: string;
}

export interface TechCategory {
  id: string;
  category: string;
  categoryZh: string;
  color: string;
  phases: PhaseChoice[];
  alternatives: { name: string; reason: string; reasonZh: string }[];
}

export const techCategories: TechCategory[] = [
  {
    id: "compute",
    category: "Compute Platform",
    categoryZh: "運算平台",
    color: "border-accent-end",
    phases: [
      {
        phase: 1,
        chosen: "ECS Fargate",
        rationale:
          "No GPU needed — zero cluster management, per-second billing. Control plane cost ($73/mo for EKS) not justified at this scale.",
        rationaleZh:
          "不需要 GPU — 免管叢集、按秒計費。EKS control plane $73/月在此規模不划算。",
      },
      {
        phase: 2,
        chosen: "Amazon EKS",
        rationale:
          "GPU node group support, HPA for auto-scaling, richer K8s ecosystem. Proven product needs production-grade orchestration.",
        rationaleZh:
          "支援 GPU node group、HPA 自動擴展、K8s 生態完整。產品已驗證，需要生產級編排。",
      },
      {
        phase: 3,
        chosen: "EKS + KEDA + Cluster Autoscaler",
        rationale:
          "KEDA scales workers proactively on SQS queue depth. Cluster Autoscaler provisions GPU nodes on demand. Spot + On-Demand mix.",
        rationaleZh:
          "KEDA 根據 SQS 佇列深度主動擴展 Worker。Cluster Autoscaler 按需擴展 GPU 節點。Spot + On-Demand 混合。",
      },
    ],
    alternatives: [
      {
        name: "Self-managed K8s",
        reason: "High ops burden, no advantage over EKS for GPU workloads",
        reasonZh: "高運維負擔，GPU 工作負載無優於 EKS 之處",
      },
      {
        name: "Docker Compose",
        reason: "No auto-scaling, suitable only for local dev",
        reasonZh: "無自動擴展，僅適合本地開發",
      },
    ],
  },
  {
    id: "stt",
    category: "STT Model",
    categoryZh: "語音轉文字模型",
    color: "border-cyan",
    phases: [
      {
        phase: 1,
        chosen: "AWS Transcribe",
        rationale:
          "Zero GPU ops, pay-per-minute ($0.024/min). Acceptable cost below 50K tasks/month. Validate product first.",
        rationaleZh:
          "零 GPU 運維，按分鐘計費（$0.024/min）。50K 任務/月以下成本可接受。先驗證產品。",
      },
      {
        phase: 2,
        chosen: "Self-hosted faster-whisper (1 GPU)",
        rationale:
          "Cost crossover at ~27K tasks/month (3-min audio). 1 A10G GPU On-Demand ($734/mo) handles ~100K tasks/month (RTF 0.10). ~73% cheaper than Transcribe at scale.",
        rationaleZh:
          "成本交叉點 ~27K 任務/月（3 分鐘音檔）。1 台 A10G GPU On-Demand（$734/月）可處理 ~100K 任務/月（RTF 0.10）。規模化後比 Transcribe 便宜 ~73%。",
      },
      {
        phase: 3,
        chosen: "Multi-GPU Pool (Spot + On-Demand)",
        rationale:
          "Horizontal GPU scaling. On-Demand for baseline, Spot for burst (40-60% savings). ~100 GPUs for 1,000+ tasks/min.",
        rationaleZh:
          "GPU 水平擴展。On-Demand 保基本容量，Spot 用於突增（省 40-60%）。~100 GPU 達成 1,000+ tasks/min。",
      },
    ],
    alternatives: [
      {
        name: "Google Speech-to-Text",
        reason: "Similar per-minute pricing, less integrated with AWS ecosystem",
        reasonZh: "類似按分鐘計價，與 AWS 生態整合度較低",
      },
      {
        name: "OpenAI Whisper API",
        reason: "Higher latency (cross-cloud), less cost-effective at scale",
        reasonZh: "較高延遲（跨雲），規模化成本較高",
      },
    ],
  },
  {
    id: "llm",
    category: "LLM Model",
    categoryZh: "大型語言模型",
    color: "border-accent-start",
    phases: [
      {
        phase: 1,
        chosen: "Amazon Bedrock (Claude/Titan)",
        rationale:
          "Zero GPU infrastructure. Access to frontier models. ~$0.001/task with Haiku (1.5K in + 500 out tokens). Ideal for POC validation.",
        rationaleZh:
          "零 GPU 基礎設施。可使用前沿模型。使用 Haiku 約 $0.001/task（1.5K 輸入 + 500 輸出 tokens）。適合 POC 驗證。",
      },
      {
        phase: 2,
        chosen: "Self-hosted vLLM 7B (1 GPU)",
        rationale:
          "Continuous batching for 3-5x throughput. Full control over model version and quantization. In-VPC low latency.",
        rationaleZh:
          "連續批次處理提升 3-5 倍吞吐量。完全掌控模型版本與量化。VPC 內低延遲。",
      },
      {
        phase: 3,
        chosen: "Multi-GPU vLLM Pool",
        rationale:
          "Same as Phase 2 but horizontally scaled. LLM is 3-5x faster than STT, so fewer GPUs needed (~25 LLM GPUs for 1,000 tasks/min).",
        rationaleZh:
          "同 Phase 2 但水平擴展。LLM 比 STT 快 3-5 倍，需要較少 GPU（~25 台達 1,000 tasks/min）。",
      },
    ],
    alternatives: [
      {
        name: "OpenAI GPT-4o",
        reason: "Higher per-call cost, external dependency, no self-hosting option",
        reasonZh: "每次呼叫成本較高，外部依賴，無法自建",
      },
    ],
  },
  {
    id: "queue",
    category: "Message Queue",
    categoryZh: "訊息佇列",
    color: "border-warning",
    phases: [
      {
        phase: 1,
        chosen: "SQS (Single Queue)",
        rationale:
          "One queue with message attributes to distinguish STT vs LLM tasks. Simplest setup for low volume.",
        rationaleZh:
          "單一佇列 + 訊息屬性區分 STT/LLM 任務。低量時最簡設定。",
      },
      {
        phase: 2,
        chosen: "SQS (Two-Stage: STT + LLM)",
        rationale:
          "Separate queues enable independent scaling, retry policies, and DLQ per stage. Independent monitoring.",
        rationaleZh:
          "分離佇列支援獨立擴展、重試策略、每階段獨立 DLQ。獨立監控。",
      },
      {
        phase: 3,
        chosen: "SQS + KEDA Scaler",
        rationale:
          "KEDA monitors ApproximateNumberOfMessages to proactively scale worker pods before CPU spikes.",
        rationaleZh:
          "KEDA 監控 ApproximateNumberOfMessages，在 CPU 飆升前主動擴展 Worker Pod。",
      },
    ],
    alternatives: [
      {
        name: "Kafka",
        reason:
          "Event streaming semantics — overkill for task queue. MSK ~$118+/mo minimum (3 × kafka.t3.small)",
        reasonZh:
          "Event Stream 語意，Task Queue 用不到。MSK 最低 ~$118+/月（3 × kafka.t3.small）",
      },
      {
        name: "RabbitMQ",
        reason:
          "Requires self-hosting. Used in local dev only (docker-compose)",
        reasonZh: "需自建。僅用於本地開發（docker-compose）",
      },
    ],
  },
  {
    id: "database",
    category: "Database",
    categoryZh: "資料庫",
    color: "border-success",
    phases: [
      {
        phase: 1,
        chosen: "RDS PostgreSQL (Single-AZ)",
        rationale:
          "ACID for task state. Single-AZ keeps cost low (~$12/mo for db.t4g.micro). Acceptable downtime risk for POC.",
        rationaleZh:
          "ACID 確保任務狀態。Single-AZ 低成本（db.t4g.micro ~$12/月）。POC 階段可接受停機風險。",
      },
      {
        phase: 2,
        chosen: "RDS PostgreSQL (Multi-AZ)",
        rationale:
          "Automatic failover for production reliability. < 60 seconds recovery. ~$95/mo (db.t4g.small Multi-AZ).",
        rationaleZh:
          "自動 failover 確保生產可靠性。恢復時間 < 60 秒。~$95/月（db.t4g.small Multi-AZ）。",
      },
      {
        phase: 3,
        chosen: "RDS Multi-AZ + Read Replica",
        rationale:
          "Read replica offloads query traffic from primary. Supports high Query QPS alongside write-heavy task processing.",
        rationaleZh:
          "Read Replica 分散查詢流量。支援高查詢 QPS 同時處理寫入密集的任務。",
      },
    ],
    alternatives: [
      {
        name: "Aurora",
        reason: "3x cost, 6-way replication overkill for this workload",
        reasonZh: "成本 3 倍，6-way replication 不必要",
      },
      {
        name: "DynamoDB",
        reason: "Poor at relational queries needed for task state management",
        reasonZh: "不擅長任務狀態管理所需的關聯式查詢",
      },
    ],
  },
  {
    id: "cache",
    category: "Cache",
    categoryZh: "快取",
    color: "border-success",
    phases: [
      {
        phase: 1,
        chosen: "ElastiCache Redis (Single Node)",
        rationale:
          "Result caching, idempotency locks, rate limiting. Single node sufficient for POC (~$12/mo for cache.t4g.micro).",
        rationaleZh:
          "結果快取、冪等鎖、Rate Limiting。單節點足夠 POC（cache.t4g.micro ~$12/月）。",
      },
      {
        phase: 2,
        chosen: "ElastiCache Redis (Multi-AZ)",
        rationale: "Automatic failover, < 30s recovery. Application falls back to DB on miss.",
        rationaleZh: "自動 failover，恢復 < 30 秒。未命中時回退到 DB。",
      },
      {
        phase: 3,
        chosen: "ElastiCache Redis (Cluster Mode)",
        rationale:
          "Sharded across nodes for higher throughput and larger dataset. Supports millions of ops/sec.",
        rationaleZh:
          "跨節點分片提升吞吐量與容量。支援百萬級 ops/sec。",
      },
    ],
    alternatives: [
      {
        name: "Memcached",
        reason: "No persistence, no pub/sub, no SETNX for distributed locks",
        reasonZh: "無持久化、無 pub/sub、無 SETNX 分散式鎖",
      },
    ],
  },
  {
    id: "observability",
    category: "Observability",
    categoryZh: "可觀測性",
    color: "border-accent-start",
    phases: [
      {
        phase: 1,
        chosen: "CloudWatch",
        rationale:
          "Built-in with AWS. Zero setup. Sufficient for basic metrics and logs at POC stage.",
        rationaleZh:
          "AWS 內建，零設定。POC 階段基本的 metrics 和 logs 足夠。",
      },
      {
        phase: 2,
        chosen: "Prometheus + Grafana",
        rationale:
          "Custom dashboards for GPU utilization, queue depth, task processing rate. Self-hosted on EKS (~$0 extra).",
        rationaleZh:
          "GPU 使用率、佇列深度、任務處理率自訂儀表板。自建在 EKS 上（~$0 額外）。",
      },
      {
        phase: 3,
        chosen: "Prometheus + Grafana + Loki + OTel + Tempo",
        rationale:
          "Full three pillars: Metrics + Logs + Traces. trace_id propagates through entire pipeline. Alerting → PagerDuty/Slack.",
        rationaleZh:
          "完整三大支柱：Metrics + Logs + Traces。trace_id 貫穿整個管線。警報 → PagerDuty/Slack。",
      },
    ],
    alternatives: [
      {
        name: "Datadog",
        reason: "Per-host pricing scales expensively with GPU nodes",
        reasonZh: "按主機計價，GPU 節點多時成本高",
      },
      {
        name: "New Relic",
        reason: "Similar per-host cost concern",
        reasonZh: "類似的按主機成本問題",
      },
    ],
  },
  {
    id: "deployment",
    category: "Deployment Strategy",
    categoryZh: "部署策略",
    color: "border-accent-end",
    phases: [
      {
        phase: 1,
        chosen: "ECS Rolling Update",
        rationale: "Simple rolling update. No canary needed for POC. Fast iteration.",
        rationaleZh: "簡單滾動更新。POC 不需要 Canary。快速迭代。",
      },
      {
        phase: 2,
        chosen: "EKS Rolling Update",
        rationale:
          "Standard K8s rolling update with readiness probes. Sufficient for moderate traffic.",
        rationaleZh:
          "標準 K8s 滾動更新搭配 readiness probes。中等流量足夠。",
      },
      {
        phase: 3,
        chosen: "Argo Rollouts (Canary)",
        rationale:
          "Progressive traffic shifting: 10% → 30% → 100%. Auto-rollback if error rate > 1% or P99 degrades. Zero-downtime.",
        rationaleZh:
          "漸進式流量切換：10% → 30% → 100%。錯誤率 > 1% 或 P99 惡化時自動回退。零停機。",
      },
    ],
    alternatives: [
      {
        name: "Blue-Green",
        reason: "Requires 2x resources during deployment, more costly",
        reasonZh: "部署期間需要 2 倍資源，成本較高",
      },
    ],
  },
  {
    id: "language",
    category: "Language & Framework",
    categoryZh: "語言與框架",
    color: "border-cyan",
    phases: [
      {
        phase: 1,
        chosen: "Go + Echo",
        rationale:
          "Goroutines (~2KB each) excel at I/O-bound HTTP calls. Single binary ~10MB Docker image. Echo provides mature middleware.",
        rationaleZh:
          "Goroutine（~2KB/個）擅長 I/O 密集 HTTP 呼叫。單一二進位 ~10MB Docker image。Echo 提供成熟中介層。",
      },
      {
        phase: 2,
        chosen: "Go + Echo",
        rationale: "Same. Workers remain HTTP clients calling model servers — Go's strengths unchanged.",
        rationaleZh: "不變。Worker 仍是呼叫 Model Server 的 HTTP 客戶端 — Go 的優勢不變。",
      },
      {
        phase: 3,
        chosen: "Go + Echo + TaskProcessor Interface",
        rationale:
          "Added plug-in interface for extensible AI task types. New processors (sentiment, NER) registered without modifying core.",
        rationaleZh:
          "新增 plug-in 介面支援可擴展 AI 任務類型。新處理器（情感分析、NER）註冊即可，不修改核心。",
      },
    ],
    alternatives: [
      {
        name: "Python",
        reason:
          "GIL limits concurrency; Worker is an I/O orchestrator (SQS → HTTP → DB), not an inference runner — Python's ML library advantage doesn't apply",
        reasonZh:
          "GIL 限制並行；Worker 角色為 I/O 調度（SQS → HTTP → DB），不執行推理 — Python 的 ML 套件優勢在此層無用武之地",
      },
      {
        name: "Java",
        reason: "Higher memory (~1MB/thread), slower cold start",
        reasonZh: "較高記憶體（~1MB/thread），冷啟動較慢",
      },
    ],
  },
];

export const PHASE_LABELS = {
  1: { en: "Phase 1: MVP", zh: "Phase 1: MVP" },
  2: { en: "Phase 2: Growth", zh: "Phase 2: Growth" },
  3: { en: "Phase 3: Scale", zh: "Phase 3: Scale" },
} as const;
