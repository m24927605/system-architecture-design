import type { ArchNode, ArchEdge } from "@/data/architecture-nodes";
import type { FlowStep, PhaseFlow } from "@/data/task-flow-steps";

/* ------------------------------------------------------------------ */
/*  Observability Stack Metrics Panel                                  */
/* ------------------------------------------------------------------ */

export interface ObsMetrics {
  components: string;
  monthlyCost: string;
  pillars: string;
  alerting: string;
  ha: string;
}

export interface ObsPhaseData {
  nodes: ArchNode[];
  edges: ArchEdge[];
  metrics: ObsMetrics;
}

/* ------------------------------------------------------------------ */
/*  Phase 1: MVP — CloudWatch Only                                     */
/* ------------------------------------------------------------------ */

const obsPhase1: ObsPhaseData = {
  nodes: [
    { id: "api", label: "API Service\n(ECS Fargate)", type: "api", position: { x: 80, y: 140 }, steps: [1, 6] },
    { id: "stt-worker", label: "STT Worker\n(Fargate)", type: "worker", position: { x: 280, y: 80 }, steps: [2] },
    { id: "llm-worker", label: "LLM Worker\n(Fargate)", type: "worker", position: { x: 280, y: 200 }, steps: [3] },
    { id: "cloudwatch", label: "CloudWatch\n(Metrics + Logs)", type: "monitoring", position: { x: 520, y: 140 }, steps: [1, 2, 3, 4] },
    { id: "cw-alarms", label: "CloudWatch\nAlarms", type: "monitoring", position: { x: 520, y: 290 }, steps: [4, 5] },
    { id: "sns", label: "SNS", type: "queue", position: { x: 700, y: 290 }, steps: [5] },
    { id: "health", label: "/health\nEndpoints", type: "external", position: { x: 80, y: 320 }, steps: [6] },
  ],
  edges: [
    { id: "e-api-cw", source: "api", target: "cloudwatch" },
    { id: "e-stt-cw", source: "stt-worker", target: "cloudwatch" },
    { id: "e-llm-cw", source: "llm-worker", target: "cloudwatch" },
    { id: "e-cw-alarms", source: "cloudwatch", target: "cw-alarms" },
    { id: "e-alarms-sns", source: "cw-alarms", target: "sns" },
    { id: "e-api-health", source: "api", target: "health" },
  ],
  metrics: {
    components: "CloudWatch Metrics\n+ CloudWatch Logs",
    monthlyCost: "~$10–30",
    pillars: "Metrics + Logs (basic)",
    alerting: "CloudWatch Alarms → SNS",
    ha: "Fully managed (AWS)",
  },
};

/* ------------------------------------------------------------------ */
/*  Phase 2: Growth — Prometheus + Grafana + Loki + PagerDuty          */
/* ------------------------------------------------------------------ */

const obsPhase2: ObsPhaseData = {
  nodes: [
    { id: "api", label: "API Service\n/metrics", type: "api", position: { x: 80, y: 80 }, steps: [1] },
    { id: "stt-worker", label: "STT Worker\n/metrics", type: "worker", position: { x: 280, y: 80 }, steps: [2] },
    { id: "llm-worker", label: "LLM Worker\n/metrics", type: "worker", position: { x: 480, y: 80 }, steps: [3] },
    { id: "prometheus", label: "Prometheus", type: "monitoring", position: { x: 280, y: 220 }, steps: [1, 2, 3, 4] },
    { id: "grafana", label: "Grafana\n(Dashboards + Alerting)", type: "monitoring", position: { x: 540, y: 220 }, steps: [4, 6, 7, 8] },
    { id: "promtail", label: "Promtail\n(DaemonSet)", type: "monitoring", position: { x: 80, y: 360 }, steps: [5] },
    { id: "loki", label: "Loki", type: "monitoring", position: { x: 280, y: 360 }, steps: [5, 6] },
    { id: "pagerduty", label: "PagerDuty", type: "external", position: { x: 540, y: 360 }, steps: [7] },
    { id: "slack", label: "Slack", type: "external", position: { x: 700, y: 360 }, steps: [8] },
  ],
  edges: [
    { id: "e-api-prom", source: "api", target: "prometheus" },
    { id: "e-stt-prom", source: "stt-worker", target: "prometheus" },
    { id: "e-llm-prom", source: "llm-worker", target: "prometheus" },
    { id: "e-prom-grafana", source: "prometheus", target: "grafana" },
    { id: "e-promtail-loki", source: "promtail", target: "loki" },
    { id: "e-loki-grafana", source: "loki", target: "grafana" },
    { id: "e-grafana-pd", source: "grafana", target: "pagerduty" },
    { id: "e-grafana-slack", source: "grafana", target: "slack" },
  ],
  metrics: {
    components: "Prometheus + Grafana + Loki",
    monthlyCost: "~$0 extra",
    pillars: "Metrics + Logs",
    alerting: "P0/P1/P2 → PagerDuty + Slack",
    ha: "Single instance",
  },
};

/* ------------------------------------------------------------------ */
/*  Phase 3: Scale — + Tempo + OTel Collector                         */
/* ------------------------------------------------------------------ */

const obsPhase3: ObsPhaseData = {
  nodes: [
    { id: "api", label: "API Service\n(OTel SDK)", type: "api", position: { x: 80, y: 60 }, steps: [1] },
    { id: "stt-worker", label: "STT Worker\n(OTel SDK)", type: "worker", position: { x: 280, y: 60 }, steps: [2] },
    { id: "llm-worker", label: "LLM Worker\n(OTel SDK)", type: "worker", position: { x: 480, y: 60 }, steps: [3] },
    { id: "otel", label: "OTel Collector", type: "monitoring", position: { x: 280, y: 170 }, steps: [1, 2, 3, 4, 5] },
    { id: "prometheus", label: "Prometheus\n(HA)", type: "monitoring", position: { x: 120, y: 290 }, steps: [4, 6] },
    { id: "tempo", label: "Tempo", type: "monitoring", position: { x: 440, y: 290 }, steps: [5, 7] },
    { id: "grafana", label: "Grafana\n(Exemplars)", type: "monitoring", position: { x: 280, y: 290 }, steps: [6, 7, 9, 10, 11] },
    { id: "promtail", label: "Promtail\n(DaemonSet)", type: "monitoring", position: { x: 80, y: 410 }, steps: [8] },
    { id: "loki", label: "Loki\n(Scalable)", type: "monitoring", position: { x: 280, y: 410 }, steps: [8, 9] },
    { id: "pagerduty", label: "PagerDuty", type: "external", position: { x: 600, y: 290 }, steps: [10] },
    { id: "slack", label: "Slack", type: "external", position: { x: 740, y: 290 }, steps: [11] },
  ],
  edges: [
    { id: "e-api-otel", source: "api", target: "otel" },
    { id: "e-stt-otel", source: "stt-worker", target: "otel" },
    { id: "e-llm-otel", source: "llm-worker", target: "otel" },
    { id: "e-otel-prom", source: "otel", target: "prometheus" },
    { id: "e-otel-tempo", source: "otel", target: "tempo" },
    { id: "e-prom-grafana", source: "prometheus", target: "grafana" },
    { id: "e-tempo-grafana", source: "tempo", target: "grafana" },
    { id: "e-promtail-loki", source: "promtail", target: "loki" },
    { id: "e-loki-grafana", source: "loki", target: "grafana" },
    { id: "e-grafana-pd", source: "grafana", target: "pagerduty" },
    { id: "e-grafana-slack", source: "grafana", target: "slack" },
  ],
  metrics: {
    components: "Prometheus + Grafana + Loki\n+ Tempo + OTel Collector",
    monthlyCost: "~$0 extra",
    pillars: "Metrics + Logs + Traces",
    alerting: "P0/P1/P2 → PagerDuty + Slack",
    ha: "All HA (2+ replicas)",
  },
};

export const obsPhases: Record<string, ObsPhaseData> = {
  phase1: obsPhase1,
  phase2: obsPhase2,
  phase3: obsPhase3,
};

/* ------------------------------------------------------------------ */
/*  Observability Data Flow Steps (per phase)                          */
/* ------------------------------------------------------------------ */

const obsPhase1Steps: FlowStep[] = [
  {
    id: 1, actor: "API Service", action: "emit logs + metrics", target: "CloudWatch",
    detail: "CloudWatch agent collects stdout logs and basic metrics (CPU, memory, request count)",
    actorType: "api", targetType: "monitoring",
    actorZh: "API 服務", actionZh: "發送日誌 + 指標", targetZh: "CloudWatch",
    detailZh: "CloudWatch agent 收集 stdout 日誌及基本指標（CPU、記憶體、請求數）",
  },
  {
    id: 2, actor: "STT Worker", action: "emit logs + metrics", target: "CloudWatch",
    detail: "Task processing logs, error counts, and Fargate resource metrics",
    actorType: "worker", targetType: "monitoring",
    actorZh: "STT Worker", actionZh: "發送日誌 + 指標", targetZh: "CloudWatch",
    detailZh: "任務處理日誌、錯誤計數及 Fargate 資源指標",
  },
  {
    id: 3, actor: "LLM Worker", action: "emit logs + metrics", target: "CloudWatch",
    detail: "Inference logs, token counts, and Fargate resource metrics",
    actorType: "worker", targetType: "monitoring",
    actorZh: "LLM Worker", actionZh: "發送日誌 + 指標", targetZh: "CloudWatch",
    detailZh: "推論日誌、token 計數及 Fargate 資源指標",
  },
  {
    id: 4, actor: "CloudWatch", action: "evaluate threshold", target: "CloudWatch Alarms",
    detail: "Metric math expressions check DLQ > 0, error rate > 5%, CPU > 80%",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "CloudWatch", actionZh: "評估閾值", targetZh: "CloudWatch Alarms",
    detailZh: "指標數學表達式檢查 DLQ > 0、錯誤率 > 5%、CPU > 80%",
  },
  {
    id: 5, actor: "CloudWatch Alarms", action: "notify", target: "SNS",
    detail: "ALARM state triggers SNS topic → email/SMS notification to on-call",
    actorType: "monitoring", targetType: "queue",
    actorZh: "CloudWatch Alarms", actionZh: "通知", targetZh: "SNS",
    detailZh: "ALARM 狀態觸發 SNS topic → 寄送 email/SMS 通知值班人員",
  },
  {
    id: 6, actor: "API Service", action: "expose /health", target: "/health Endpoints",
    detail: "Liveness + readiness probes for ECS health checks and ALB target group",
    actorType: "api", targetType: "external",
    actorZh: "API 服務", actionZh: "公開 /health", targetZh: "/health 端點",
    detailZh: "Liveness + readiness probe 供 ECS 健康檢查及 ALB target group 使用",
  },
];

const obsPhase2Steps: FlowStep[] = [
  {
    id: 1, actor: "Prometheus", action: "scrape /metrics", target: "API Service",
    detail: "Pull model: Prometheus scrapes /metrics endpoint every 15s (http_requests_total, latency histograms)",
    actorType: "monitoring", targetType: "api",
    actorZh: "Prometheus", actionZh: "抓取 /metrics", targetZh: "API 服務",
    detailZh: "Pull 模式：Prometheus 每 15 秒抓取 /metrics 端點（http_requests_total、延遲直方圖）",
  },
  {
    id: 2, actor: "Prometheus", action: "scrape /metrics", target: "STT Worker",
    detail: "Collects stt_tasks_processed_total, stt_processing_duration_seconds, queue consumer lag",
    actorType: "monitoring", targetType: "worker",
    actorZh: "Prometheus", actionZh: "抓取 /metrics", targetZh: "STT Worker",
    detailZh: "收集 stt_tasks_processed_total、stt_processing_duration_seconds、佇列消費者延遲",
  },
  {
    id: 3, actor: "Prometheus", action: "scrape /metrics", target: "LLM Worker",
    detail: "Collects llm_tasks_processed_total, token counts, inference latency, GPU metrics via DCGM",
    actorType: "monitoring", targetType: "worker",
    actorZh: "Prometheus", actionZh: "抓取 /metrics", targetZh: "LLM Worker",
    detailZh: "收集 llm_tasks_processed_total、token 計數、推論延遲、透過 DCGM 的 GPU 指標",
  },
  {
    id: 4, actor: "Prometheus", action: "datasource query", target: "Grafana",
    detail: "PromQL queries power real-time dashboards: request rate, error ratio, P95 latency, GPU utilization",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Prometheus", actionZh: "資料源查詢", targetZh: "Grafana",
    detailZh: "PromQL 查詢驅動即時儀表板：請求率、錯誤比、P95 延遲、GPU 使用率",
  },
  {
    id: 5, actor: "Promtail", action: "ship logs", target: "Loki",
    detail: "DaemonSet tails container logs, adds K8s labels (pod, namespace, node), pushes to Loki",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Promtail", actionZh: "傳送日誌", targetZh: "Loki",
    detailZh: "DaemonSet 追蹤容器日誌，加入 K8s 標籤（pod、namespace、node），推送至 Loki",
  },
  {
    id: 6, actor: "Loki", action: "log query", target: "Grafana",
    detail: "LogQL queries in Grafana: filter by pod, search errors, correlate with metrics panels",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Loki", actionZh: "日誌查詢", targetZh: "Grafana",
    detailZh: "Grafana 中的 LogQL 查詢：依 pod 篩選、搜尋錯誤、與指標面板關聯",
  },
  {
    id: 7, actor: "Grafana", action: "P0/P1 alert", target: "PagerDuty",
    detail: "Alert rules evaluate every 1 min; P0 (Critical) and P1 (Warning) route to PagerDuty on-call",
    actorType: "monitoring", targetType: "external",
    actorZh: "Grafana", actionZh: "P0/P1 警報", targetZh: "PagerDuty",
    detailZh: "警報規則每分鐘評估；P0（嚴重）和 P1（警告）路由到 PagerDuty 值班",
  },
  {
    id: 8, actor: "Grafana", action: "P2 notification", target: "Slack",
    detail: "P2 (Info) alerts sent to Slack #ops-info channel for awareness, no paging",
    actorType: "monitoring", targetType: "external",
    actorZh: "Grafana", actionZh: "P2 通知", targetZh: "Slack",
    detailZh: "P2（資訊）警報發送至 Slack #ops-info 頻道供知悉，不觸發呼叫",
  },
];

const obsPhase3Steps: FlowStep[] = [
  {
    id: 1, actor: "API Service", action: "export traces + metrics", target: "OTel Collector",
    detail: "OTel SDK auto-instruments HTTP handlers, emits spans + metrics via OTLP/gRPC",
    actorType: "api", targetType: "monitoring",
    actorZh: "API 服務", actionZh: "匯出追蹤 + 指標", targetZh: "OTel Collector",
    detailZh: "OTel SDK 自動埋點 HTTP handler，透過 OTLP/gRPC 發送 span + 指標",
  },
  {
    id: 2, actor: "STT Worker", action: "export traces + metrics", target: "OTel Collector",
    detail: "Traces include: dequeue → audio download → Whisper inference → DB write spans",
    actorType: "worker", targetType: "monitoring",
    actorZh: "STT Worker", actionZh: "匯出追蹤 + 指標", targetZh: "OTel Collector",
    detailZh: "追蹤包含：取出佇列 → 下載音檔 → Whisper 推論 → 寫入 DB 的 span",
  },
  {
    id: 3, actor: "LLM Worker", action: "export traces + metrics", target: "OTel Collector",
    detail: "Traces include: dequeue → prompt build → vLLM inference → DB write spans with token counts",
    actorType: "worker", targetType: "monitoring",
    actorZh: "LLM Worker", actionZh: "匯出追蹤 + 指標", targetZh: "OTel Collector",
    detailZh: "追蹤包含：取出佇列 → 建構 prompt → vLLM 推論 → 寫入 DB 的 span（含 token 計數）",
  },
  {
    id: 4, actor: "OTel Collector", action: "remote_write metrics", target: "Prometheus (HA)",
    detail: "Collector pipelines: filter, batch, export metrics to Prometheus via remote_write (15s scrape equivalent)",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "OTel Collector", actionZh: "remote_write 指標", targetZh: "Prometheus (HA)",
    detailZh: "Collector pipeline：篩選、批次、透過 remote_write 匯出指標至 Prometheus（等效 15 秒抓取）",
  },
  {
    id: 5, actor: "OTel Collector", action: "export traces", target: "Tempo",
    detail: "OTLP/gRPC export: distributed traces with trace_id propagated through SQS → workers → model servers",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "OTel Collector", actionZh: "匯出追蹤", targetZh: "Tempo",
    detailZh: "OTLP/gRPC 匯出：分散式追蹤的 trace_id 透過 SQS → Worker → Model Server 傳播",
  },
  {
    id: 6, actor: "Prometheus", action: "datasource query", target: "Grafana",
    detail: "HA Prometheus pair with deduplication; PromQL powers dashboards + recording rules",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Prometheus", actionZh: "資料源查詢", targetZh: "Grafana",
    detailZh: "HA Prometheus 配對搭配去重；PromQL 驅動儀表板 + recording rules",
  },
  {
    id: 7, actor: "Tempo", action: "trace query", target: "Grafana",
    detail: "TraceQL queries + exemplars: click metric spike → jump to exact trace → see per-span breakdown",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Tempo", actionZh: "追蹤查詢", targetZh: "Grafana",
    detailZh: "TraceQL 查詢 + exemplars：點擊指標尖峰 → 跳轉至精確追蹤 → 查看每 span 細節",
  },
  {
    id: 8, actor: "Promtail", action: "ship logs", target: "Loki (Scalable)",
    detail: "DaemonSet tails logs, enriches with K8s labels; Loki in microservices mode for horizontal scaling",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Promtail", actionZh: "傳送日誌", targetZh: "Loki (Scalable)",
    detailZh: "DaemonSet 追蹤日誌，加入 K8s 標籤；Loki 微服務模式支援水平擴展",
  },
  {
    id: 9, actor: "Loki", action: "log query", target: "Grafana",
    detail: "LogQL with trace_id correlation: click log line → jump to full distributed trace in Tempo",
    actorType: "monitoring", targetType: "monitoring",
    actorZh: "Loki", actionZh: "日誌查詢", targetZh: "Grafana",
    detailZh: "LogQL 搭配 trace_id 關聯：點擊日誌行 → 跳轉至 Tempo 完整分散式追蹤",
  },
  {
    id: 10, actor: "Grafana", action: "P0/P1 alert", target: "PagerDuty",
    detail: "Multi-signal alerts: combine metric threshold + log pattern + trace error rate for high-confidence alerting",
    actorType: "monitoring", targetType: "external",
    actorZh: "Grafana", actionZh: "P0/P1 警報", targetZh: "PagerDuty",
    detailZh: "多信號警報：結合指標閾值 + 日誌模式 + 追蹤錯誤率實現高信心度警報",
  },
  {
    id: 11, actor: "Grafana", action: "P2 notification", target: "Slack",
    detail: "P2 (Info) alerts to Slack #ops-info; includes Grafana dashboard link for quick context",
    actorType: "monitoring", targetType: "external",
    actorZh: "Grafana", actionZh: "P2 通知", targetZh: "Slack",
    detailZh: "P2（資訊）警報至 Slack #ops-info；附帶 Grafana 儀表板連結快速了解上下文",
  },
];

export const obsFlows: PhaseFlow[] = [
  { key: "phase1", steps: obsPhase1Steps },
  { key: "phase2", steps: obsPhase2Steps },
  { key: "phase3", steps: obsPhase3Steps },
];

/* ------------------------------------------------------------------ */
/*  Alert Tier Data                                                    */
/* ------------------------------------------------------------------ */

export interface AlertRule {
  alert: string;
  alertZh: string;
  condition: string;
  duration: string;
}

export interface AlertTier {
  tier: string;
  severity: string;
  severityKey: string;
  color: string;
  channels: string;
  channelsZh: string;
  rules: AlertRule[];
}

export const alertTiers: AlertTier[] = [
  {
    tier: "P0",
    severity: "Critical",
    severityKey: "critical",
    color: "#EF4444",
    channels: "PagerDuty (High) + Slack #incident",
    channelsZh: "PagerDuty (High) + Slack #incident",
    rules: [
      { alert: "Service unavailable", alertZh: "服務不可用", condition: "up == 0 all instances", duration: "2 min" },
      { alert: "DLQ accumulation", alertZh: "DLQ 訊息堆積", condition: "DLQ messages > 0", duration: "1 min" },
      { alert: "All GPUs offline", alertZh: "GPU 全部離線", condition: "GPU count == 0", duration: "3 min" },
      { alert: "API error rate spike", alertZh: "API 錯誤率飆升", condition: "5xx rate > 20%", duration: "3 min" },
      { alert: "DB connection exhaustion", alertZh: "資料庫連線耗盡", condition: "connections > 90%", duration: "2 min" },
      { alert: "SQS message age", alertZh: "SQS 訊息年齡過長", condition: "oldest msg > 30 min", duration: "5 min" },
    ],
  },
  {
    tier: "P1",
    severity: "Warning",
    severityKey: "warning",
    color: "#F59E0B",
    channels: "PagerDuty (Low) + Slack #alerts",
    channelsZh: "PagerDuty (Low) + Slack #alerts",
    rules: [
      { alert: "Error rate elevated", alertZh: "錯誤率偏高", condition: "error rate > 5%", duration: "5 min" },
      { alert: "API P99 latency high", alertZh: "API P99 延遲過高", condition: "P99 > 3s", duration: "5 min" },
      { alert: "STT processing slow", alertZh: "STT 處理緩慢", condition: "P95 > 15s", duration: "5 min" },
      { alert: "GPU utilization high", alertZh: "GPU 使用率過高", condition: "GPU > 85%", duration: "10 min" },
      { alert: "SQS queue depth growing", alertZh: "SQS 佇列深度增長", condition: "depth > 1000", duration: "5 min" },
      { alert: "Redis memory high", alertZh: "Redis 記憶體偏高", condition: "memory > 80%", duration: "5 min" },
      { alert: "Pod frequent restarts", alertZh: "Pod 頻繁重啟", condition: "restarts > 3/hr", duration: "Immediate" },
      { alert: "ArgoCD sync failed", alertZh: "ArgoCD 同步失敗", condition: "OutOfSync", duration: "10 min" },
    ],
  },
  {
    tier: "P2",
    severity: "Info",
    severityKey: "info",
    color: "#22D3EE",
    channels: "Slack #ops-info only",
    channelsZh: "僅 Slack #ops-info",
    rules: [
      { alert: "Cache hit ratio drop", alertZh: "快取命中率下降", condition: "hit ratio < 80%", duration: "15 min" },
      { alert: "Disk usage high", alertZh: "磁碟使用率偏高", condition: "available < 20%", duration: "10 min" },
      { alert: "GPU temperature high", alertZh: "GPU 溫度偏高", condition: "temp > 80°C", duration: "10 min" },
      { alert: "RDS replication lag", alertZh: "RDS 複製延遲", condition: "lag > 5s", duration: "10 min" },
      { alert: "Canary rollout paused", alertZh: "Canary 部署暫停", condition: "phase == Paused", duration: "5 min" },
      { alert: "Node CPU high", alertZh: "節點 CPU 偏高", condition: "CPU > 75%", duration: "15 min" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Metrics Coverage Data                                              */
/* ------------------------------------------------------------------ */

export type MetricType = "Counter" | "Histogram" | "Gauge";

export interface MetricItem {
  name: string;
  type: MetricType;
  desc: string;
  descZh: string;
}

export interface MetricGroup {
  service: string;
  serviceZh: string;
  metrics: MetricItem[];
}

export interface MetricCategory {
  key: string;
  groups: MetricGroup[];
}

export const metricCategories: MetricCategory[] = [
  {
    key: "application",
    groups: [
      {
        service: "API Service",
        serviceZh: "API 服務",
        metrics: [
          { name: "http_requests_total", type: "Counter", desc: "Total requests by method/path/status", descZh: "依方法/路徑/狀態分類的請求總數" },
          { name: "http_request_duration_seconds", type: "Histogram", desc: "Request latency (P50/P95/P99)", descZh: "請求延遲分佈" },
          { name: "http_requests_in_flight", type: "Gauge", desc: "Current in-flight requests", descZh: "當前進行中的請求數" },
          { name: "task_created_total", type: "Counter", desc: "Tasks created by type", descZh: "依類型分類的建立任務數" },
        ],
      },
      {
        service: "STT Worker",
        serviceZh: "STT Worker",
        metrics: [
          { name: "stt_tasks_processed_total", type: "Counter", desc: "Processed tasks (success/failure)", descZh: "已處理任務數" },
          { name: "stt_processing_duration_seconds", type: "Histogram", desc: "STT inference time", descZh: "STT 推理時間" },
          { name: "stt_queue_consumer_lag", type: "Gauge", desc: "Consumer lag messages", descZh: "消費者落後訊息數" },
          { name: "stt_model_inference_errors_total", type: "Counter", desc: "Model inference errors", descZh: "模型推理錯誤數" },
          { name: "stt_audio_duration_seconds", type: "Histogram", desc: "Input audio duration", descZh: "輸入音檔長度分佈" },
        ],
      },
      {
        service: "LLM Worker",
        serviceZh: "LLM Worker",
        metrics: [
          { name: "llm_tasks_processed_total", type: "Counter", desc: "Processed tasks (success/failure)", descZh: "已處理任務數" },
          { name: "llm_processing_duration_seconds", type: "Histogram", desc: "LLM inference time", descZh: "LLM 推理時間" },
          { name: "llm_queue_consumer_lag", type: "Gauge", desc: "Consumer lag messages", descZh: "消費者落後訊息數" },
          { name: "llm_model_inference_errors_total", type: "Counter", desc: "Model inference errors", descZh: "模型推理錯誤數" },
          { name: "llm_input_tokens_total", type: "Counter", desc: "Total input tokens", descZh: "輸入 token 總數" },
          { name: "llm_output_tokens_total", type: "Counter", desc: "Total output tokens", descZh: "輸出 token 總數" },
        ],
      },
    ],
  },
  {
    key: "gpu",
    groups: [
      {
        service: "NVIDIA DCGM Exporter",
        serviceZh: "NVIDIA DCGM Exporter",
        metrics: [
          { name: "DCGM_FI_DEV_GPU_UTIL", type: "Gauge", desc: "GPU core utilization (%)", descZh: "GPU 核心使用率 (%)" },
          { name: "DCGM_FI_DEV_MEM_COPY_UTIL", type: "Gauge", desc: "GPU memory utilization (%)", descZh: "GPU 記憶體使用率 (%)" },
          { name: "DCGM_FI_DEV_GPU_TEMP", type: "Gauge", desc: "GPU temperature (°C)", descZh: "GPU 溫度 (°C)" },
          { name: "DCGM_FI_DEV_POWER_USAGE", type: "Gauge", desc: "GPU power usage (W)", descZh: "GPU 功耗 (W)" },
          { name: "DCGM_FI_DEV_MEM_USED", type: "Gauge", desc: "GPU memory used (bytes)", descZh: "GPU 記憶體使用量" },
          { name: "DCGM_FI_DEV_ENC_UTIL", type: "Gauge", desc: "Encoder utilization", descZh: "Encoder 使用率" },
        ],
      },
    ],
  },
  {
    key: "infrastructure",
    groups: [
      {
        service: "PostgreSQL (RDS)",
        serviceZh: "PostgreSQL (RDS)",
        metrics: [
          { name: "pg_stat_activity_count", type: "Gauge", desc: "Active connections", descZh: "活躍連線數" },
          { name: "pg_stat_database_tup_fetched", type: "Counter", desc: "Query throughput", descZh: "查詢吞吐量" },
          { name: "pg_stat_database_deadlocks", type: "Counter", desc: "Deadlock count", descZh: "死鎖次數" },
          { name: "pg_replication_lag_seconds", type: "Gauge", desc: "Replication lag", descZh: "複製延遲" },
          { name: "pg_stat_database_blks_hit_ratio", type: "Gauge", desc: "Buffer cache hit ratio", descZh: "Buffer cache 命中率" },
        ],
      },
      {
        service: "Redis (ElastiCache)",
        serviceZh: "Redis (ElastiCache)",
        metrics: [
          { name: "redis_keyspace_hits_ratio", type: "Gauge", desc: "Cache hit ratio", descZh: "快取命中率" },
          { name: "redis_connected_clients", type: "Gauge", desc: "Connection count", descZh: "連線數" },
          { name: "redis_used_memory_bytes", type: "Gauge", desc: "Memory usage", descZh: "記憶體使用量" },
          { name: "redis_evicted_keys_total", type: "Counter", desc: "Evicted key count", descZh: "被驅逐 key 數" },
          { name: "redis_commands_processed_total", type: "Counter", desc: "Command processing rate", descZh: "命令處理速率" },
        ],
      },
      {
        service: "SQS Queues",
        serviceZh: "SQS 佇列",
        metrics: [
          { name: "aws_sqs_approx_messages_visible", type: "Gauge", desc: "Queue depth", descZh: "佇列深度" },
          { name: "aws_sqs_approx_messages_not_visible", type: "Gauge", desc: "In-flight messages", descZh: "處理中訊息數" },
          { name: "aws_sqs_approx_age_oldest_message", type: "Gauge", desc: "Oldest message age", descZh: "最舊訊息年齡" },
          { name: "aws_sqs_messages_sent", type: "Counter", desc: "Send rate", descZh: "發送速率" },
          { name: "aws_sqs_dlq_messages_visible", type: "Gauge", desc: "DLQ depth", descZh: "DLQ 深度" },
        ],
      },
    ],
  },
  {
    key: "network",
    groups: [
      {
        service: "Ingress & ALB",
        serviceZh: "Ingress & ALB",
        metrics: [
          { name: "nginx_ingress_requests", type: "Counter", desc: "Ingress request count", descZh: "Ingress 請求數" },
          { name: "nginx_ingress_request_duration", type: "Histogram", desc: "Ingress latency", descZh: "Ingress 延遲" },
          { name: "aws_alb_target_response_time", type: "Gauge", desc: "ALB target response time", descZh: "ALB 回應時間" },
          { name: "aws_alb_healthy_host_count", type: "Gauge", desc: "Healthy host count", descZh: "健康主機數" },
          { name: "coredns_request_duration", type: "Histogram", desc: "DNS resolution latency", descZh: "DNS 解析延遲" },
        ],
      },
    ],
  },
  {
    key: "cicd",
    groups: [
      {
        service: "ArgoCD & Rollouts",
        serviceZh: "ArgoCD & Rollouts",
        metrics: [
          { name: "argocd_app_sync_status", type: "Gauge", desc: "App sync status", descZh: "App 同步狀態" },
          { name: "argocd_app_health_status", type: "Gauge", desc: "App health status", descZh: "App 健康狀態" },
          { name: "rollout_phase", type: "Gauge", desc: "Canary deployment phase", descZh: "Canary 部署階段" },
          { name: "rollout_canary_weight", type: "Gauge", desc: "Canary traffic weight", descZh: "Canary 流量比例" },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Dashboard Preview Data (static fake values for display)            */
/* ------------------------------------------------------------------ */

export interface DashboardService {
  name: string;
  nameZh: string;
  status: string;
  value: string;
  sparkline: number[];
}

export const dashboardServices: DashboardService[] = [
  { name: "API Service", nameZh: "API 服務", status: "UP", value: "12 req/s", sparkline: [20, 35, 28, 45, 40, 55, 48, 60, 52, 58] },
  { name: "STT Worker", nameZh: "STT Worker", status: "UP", value: "8 tasks/min", sparkline: [15, 20, 18, 25, 22, 30, 28, 32, 26, 30] },
  { name: "LLM Worker", nameZh: "LLM Worker", status: "UP", value: "25 tasks/min", sparkline: [30, 40, 35, 50, 45, 55, 50, 60, 55, 58] },
];

export interface DashboardInfra {
  name: string;
  nameZh: string;
  lines: { label: string; value: string }[];
}

export const dashboardInfra: DashboardInfra[] = [
  { name: "PostgreSQL", nameZh: "PostgreSQL", lines: [{ label: "Conn", value: "23/100" }, { label: "P95", value: "8ms" }] },
  { name: "Redis", nameZh: "Redis", lines: [{ label: "Hit", value: "94%" }, { label: "Mem", value: "1.2GB" }] },
  { name: "SQS", nameZh: "SQS", lines: [{ label: "DLQ", value: "0" }, { label: "Oldest", value: "2s" }] },
];

export const dashboardPipeline = [
  { label: "Upload", value: "48/min" },
  { label: "SQS-STT", value: "depth:12" },
  { label: "SQS-LLM", value: "depth:3" },
  { label: "Done", value: "45/min" },
];
