export interface TechChoice {
  id: string;
  category: string;
  categoryZh: string;
  chosen: string;
  rationale: string;
  rationaleZh: string;
  alternatives: { name: string; reason: string; reasonZh: string }[];
  color: string; // tailwind border color class
}

export const techChoices: TechChoice[] = [
  {
    id: "language",
    category: "Language",
    categoryZh: "程式語言",
    chosen: "Go",
    rationale:
      "Goroutines excel at I/O-bound worker tasks. Single binary deployment. Low memory (~30-50MB per pod).",
    rationaleZh:
      "Goroutine 擅長 I/O 密集型工作，單一二進位部署，低記憶體（~30-50MB/Pod）",
    alternatives: [
      {
        name: "Python",
        reason:
          "GIL limits concurrency; ML ecosystem irrelevant (workers only make HTTP calls)",
        reasonZh:
          "GIL 限制並行；ML 生態系不相關（Worker 只做 HTTP 呼叫）",
      },
      {
        name: "Java",
        reason:
          "Higher memory footprint (~1MB per thread), slower cold start",
        reasonZh: "較高記憶體（~1MB/thread），冷啟動較慢",
      },
    ],
    color: "border-cyan",
  },
  {
    id: "framework",
    category: "API Framework",
    categoryZh: "API 框架",
    chosen: "Echo",
    rationale:
      "Lightweight with mature middleware ecosystem (auth, CORS, rate limiting). Performance close to net/http.",
    rationaleZh:
      "輕量但中介層生態成熟（auth, CORS, rate limiting），效能接近 net/http",
    alternatives: [
      {
        name: "Gin",
        reason: "Similar performance, fewer built-in middleware",
        reasonZh: "效能相似但內建中介層較少",
      },
      {
        name: "Fiber",
        reason: "fasthttp-based, less standard library compatible",
        reasonZh: "基於 fasthttp，與標準庫相容性較差",
      },
    ],
    color: "border-accent-start",
  },
  {
    id: "queue",
    category: "Message Queue",
    categoryZh: "訊息佇列",
    chosen: "Amazon SQS",
    rationale:
      "Fully managed, zero ops, built-in DLQ, $0.20/500K messages. Task queue semantics (process once, delete).",
    rationaleZh:
      "全託管零運維，內建 DLQ，$0.20/500K 訊息，Task Queue 語意",
    alternatives: [
      {
        name: "Kafka",
        reason:
          "Event streaming semantics — overkill for task queue. MSK costs $200+/month",
        reasonZh:
          "Event Stream 語意，Task Queue 用不到。MSK 成本 $200+/月",
      },
      {
        name: "RabbitMQ",
        reason:
          "Requires self-hosting. Used in local dev only (docker-compose)",
        reasonZh: "需自建。僅用於本地開發（docker-compose）",
      },
    ],
    color: "border-warning",
  },
  {
    id: "database",
    category: "Database",
    categoryZh: "資料庫",
    chosen: "RDS PostgreSQL",
    rationale:
      "ACID for task state consistency. TOAST handles large text. Well-understood, cost-effective.",
    rationaleZh:
      "ACID 確保任務狀態一致性，TOAST 處理大型文字，成熟穩定",
    alternatives: [
      {
        name: "Aurora",
        reason:
          "3x cost, 6-way replication unnecessary for this workload",
        reasonZh: "成本 3 倍，6-way replication 不必要",
      },
      {
        name: "DynamoDB",
        reason:
          "Poor at relational queries needed for task management",
        reasonZh: "不擅長任務管理所需的關聯式查詢",
      },
    ],
    color: "border-success",
  },
  {
    id: "orchestration",
    category: "Container Orchestration",
    categoryZh: "容器編排",
    chosen: "ECS (Phase 1) → EKS (Phase 2+)",
    rationale:
      "ECS Fargate for MVP simplicity. EKS for GPU node groups, HPA/KEDA, Argo Rollouts.",
    rationaleZh:
      "ECS Fargate 用於 MVP 簡化運維，EKS 用於 GPU 節點、HPA/KEDA、Argo Rollouts",
    alternatives: [
      {
        name: "Self-managed K8s",
        reason:
          "High operational burden, no advantage over EKS",
        reasonZh: "高運維負擔，無優於 EKS 之處",
      },
    ],
    color: "border-accent-end",
  },
  {
    id: "observability",
    category: "Observability",
    categoryZh: "可觀測性",
    chosen: "Prometheus + Grafana + Loki + Tempo",
    rationale:
      "Open-source stack avoids per-host pricing. Full control. Metrics + Logs + Traces unified.",
    rationaleZh:
      "開源方案避免按主機計價，完全掌控，Metrics + Logs + Traces 統一",
    alternatives: [
      {
        name: "Datadog",
        reason:
          "Per-host pricing scales expensively with GPU nodes",
        reasonZh: "按主機計價，GPU 節點多時成本高",
      },
      {
        name: "New Relic",
        reason: "Similar per-host cost concern",
        reasonZh: "類似的按主機成本問題",
      },
    ],
    color: "border-accent-start",
  },
];
