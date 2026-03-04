import type { ArchNode, ArchEdge } from "@/data/architecture-nodes";

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
/*  Phase 2: Growth — Prometheus + Grafana + Loki + PagerDuty          */
/* ------------------------------------------------------------------ */

const obsPhase2: ObsPhaseData = {
  nodes: [
    { id: "api", label: "API Service\n/metrics", type: "api", position: { x: 80, y: 80 } },
    { id: "stt-worker", label: "STT Worker\n/metrics", type: "worker", position: { x: 280, y: 80 } },
    { id: "llm-worker", label: "LLM Worker\n/metrics", type: "worker", position: { x: 480, y: 80 } },
    { id: "prometheus", label: "Prometheus", type: "monitoring", position: { x: 280, y: 220 } },
    { id: "grafana", label: "Grafana\n(Dashboards + Alerting)", type: "monitoring", position: { x: 540, y: 220 } },
    { id: "promtail", label: "Promtail\n(DaemonSet)", type: "monitoring", position: { x: 80, y: 360 } },
    { id: "loki", label: "Loki", type: "monitoring", position: { x: 280, y: 360 } },
    { id: "pagerduty", label: "PagerDuty", type: "external", position: { x: 540, y: 360 } },
    { id: "slack", label: "Slack", type: "external", position: { x: 700, y: 360 } },
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
    monthlyCost: "~$183",
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
    { id: "api", label: "API Service\n(OTel SDK)", type: "api", position: { x: 80, y: 60 } },
    { id: "stt-worker", label: "STT Worker\n(OTel SDK)", type: "worker", position: { x: 280, y: 60 } },
    { id: "llm-worker", label: "LLM Worker\n(OTel SDK)", type: "worker", position: { x: 480, y: 60 } },
    { id: "otel", label: "OTel Collector", type: "monitoring", position: { x: 280, y: 170 } },
    { id: "prometheus", label: "Prometheus\n(HA)", type: "monitoring", position: { x: 120, y: 290 } },
    { id: "tempo", label: "Tempo", type: "monitoring", position: { x: 440, y: 290 } },
    { id: "grafana", label: "Grafana\n(Exemplars)", type: "monitoring", position: { x: 280, y: 290 } },
    { id: "promtail", label: "Promtail\n(DaemonSet)", type: "monitoring", position: { x: 80, y: 410 } },
    { id: "loki", label: "Loki\n(Scalable)", type: "monitoring", position: { x: 280, y: 410 } },
    { id: "pagerduty", label: "PagerDuty", type: "external", position: { x: 600, y: 290 } },
    { id: "slack", label: "Slack", type: "external", position: { x: 740, y: 290 } },
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
    monthlyCost: "~$502",
    pillars: "Metrics + Logs + Traces",
    alerting: "P0/P1/P2 → PagerDuty + Slack",
    ha: "All HA (2+ replicas)",
  },
};

export const obsPhases: Record<string, ObsPhaseData> = {
  phase2: obsPhase2,
  phase3: obsPhase3,
};

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
