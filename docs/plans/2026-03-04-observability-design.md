# Observability Design: Prometheus + Grafana Stack

**Date**: 2026-03-04
**Status**: Approved
**Approach**: Grafana Stack (Prometheus + Loki + Tempo + Grafana + PagerDuty)

## Overview

Full observability stack design for Heph-AI platform, covering the three pillars (Metrics, Logs, Traces) across all services. Introduces comprehensive monitoring at the Growth phase (Phase 2), with distributed tracing added at Scale phase (Phase 3).

### Phase Rollout

| Phase | Components |
|-------|-----------|
| Phase 2 (Growth) | Prometheus + Grafana + Loki + Promtail + PagerDuty |
| Phase 3 (Scale) | + Tempo + OpenTelemetry Collector + Exemplars |

### Monitoring Coverage (10 Dimensions)

1. API Service
2. STT Worker
3. LLM Worker
4. GPU Nodes
5. PostgreSQL (RDS)
6. Redis (ElastiCache)
7. SQS Queues
8. EKS Cluster
9. Network Layer (Ingress / ALB / DNS)
10. CI/CD (ArgoCD / Argo Rollouts)

---

## 1. Architecture

### Phase 2 (Growth)

```
┌─────────────────────────────────────────────────────┐
│                    EKS Cluster                       │
│                                                     │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐        │
│  │API Service│  │STT Worker │  │LLM Worker │        │
│  │ /metrics  │  │ /metrics  │  │ /metrics  │        │
│  └────┬──────┘  └─────┬─────┘  └─────┬─────┘        │
│       │               │               │              │
│       │    ┌──────────────────────┐    │              │
│       └────┤     Prometheus       ├────┘              │
│            │  (kube-prometheus-   │                   │
│            │   stack Helm)        │                   │
│            └──────────┬───────────┘                   │
│                       │                              │
│  ┌─────────┐   ┌─────┴──────┐   ┌─────────────┐    │
│  │ Promtail │──▶│  Grafana    │◀──│    Loki      │    │
│  │(DaemonSet)│  │(Dashboards │   │(Log Storage) │    │
│  └─────────┘   │ + Alerting)│   └─────────────┘    │
│                └──┬────┬────┘                       │
│                   │    │                            │
└───────────────────┼────┼────────────────────────────┘
                    │    │
              ┌─────┘    └──────┐
              ▼                 ▼
         ┌─────────┐     ┌──────────┐
         │PagerDuty│     │  Slack   │
         │(P0, P1) │     │(P1, P2) │
         └─────────┘     └──────────┘
```

### Phase 3 (Scale) Additions

```
┌─────────────────────────────────────────────────────┐
│                    EKS Cluster                       │
│                                                     │
│  ┌──────────────────────────────┐                   │
│  │   OpenTelemetry Collector     │                   │
│  │   (traces + metrics bridge)  │                   │
│  └──────────────┬───────────────┘                   │
│                 │                                    │
│          ┌──────┴──────┐                             │
│          │    Tempo     │                             │
│          │(Trace Store) │                             │
│          └──────┬──────┘                             │
│                 │                                    │
│          ┌──────┴──────┐                             │
│          │   Grafana    │  ← Metrics↔Logs↔Traces     │
│          │  Exemplars   │    one-click navigation    │
│          └─────────────┘                             │
└─────────────────────────────────────────────────────┘
```

### Component Matrix

| Component | Phase 2 (Growth) | Phase 3 (Scale) |
|-----------|------------------|-----------------|
| **Metrics** | Prometheus + Grafana | + OpenTelemetry metrics bridge |
| **Logs** | Loki + Promtail + Grafana | + extended retention + S3 backend |
| **Traces** | — | Tempo + OpenTelemetry Collector + Grafana |
| **Alerting** | Grafana Alerting | + Canary deployment metrics |
| **Notifications** | PagerDuty (P0/P1) + Slack (P1/P2) | Same |
| **Deployment** | Helm: `kube-prometheus-stack` + `loki-stack` | + `tempo-distributed` Helm chart |

---

## 2. Metrics Design (Prometheus)

### 2.1 Application Layer

#### API Service

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method, path, status_code |
| `http_request_duration_seconds` | Histogram | Request latency distribution (P50/P95/P99) |
| `http_requests_in_flight` | Gauge | Current in-flight requests |
| `task_created_total` | Counter | Tasks created by task_type |

#### STT Worker

| Metric | Type | Description |
|--------|------|-------------|
| `stt_tasks_processed_total` | Counter | Processed tasks by status (success/failure) |
| `stt_processing_duration_seconds` | Histogram | Single STT inference time |
| `stt_queue_consumer_lag` | Gauge | Consumer lag message count |
| `stt_model_inference_errors_total` | Counter | Model inference error count |
| `stt_audio_duration_seconds` | Histogram | Input audio duration distribution |

#### LLM Worker

| Metric | Type | Description |
|--------|------|-------------|
| `llm_tasks_processed_total` | Counter | Processed tasks by status (success/failure) |
| `llm_processing_duration_seconds` | Histogram | Single LLM inference time |
| `llm_queue_consumer_lag` | Gauge | Consumer lag message count |
| `llm_model_inference_errors_total` | Counter | Model inference error count |
| `llm_input_tokens_total` | Counter | Total input tokens |
| `llm_output_tokens_total` | Counter | Total output tokens |

### 2.2 GPU Layer

Via `nvidia-dcgm-exporter` DaemonSet:

| Metric | Description |
|--------|-------------|
| `DCGM_FI_DEV_GPU_UTIL` | GPU core utilization (%) |
| `DCGM_FI_DEV_MEM_COPY_UTIL` | GPU memory utilization (%) |
| `DCGM_FI_DEV_GPU_TEMP` | GPU temperature (C) |
| `DCGM_FI_DEV_POWER_USAGE` | GPU power usage (W) |
| `DCGM_FI_DEV_MEM_USED` | GPU memory used (bytes) |
| `DCGM_FI_DEV_ENC_UTIL` | Encoder utilization |

### 2.3 Infrastructure Layer

#### PostgreSQL (RDS)

Via `postgres_exporter` or CloudWatch Exporter:

| Metric | Description |
|--------|-------------|
| `pg_stat_activity_count` | Active connections |
| `pg_stat_database_tup_fetched` | Query throughput |
| `pg_stat_database_deadlocks` | Deadlock count |
| `pg_replication_lag_seconds` | Replication lag (Phase 3 Read Replica) |
| `pg_stat_database_blks_hit_ratio` | Buffer cache hit ratio |

#### Redis (ElastiCache)

Via `redis_exporter` or CloudWatch Exporter:

| Metric | Description |
|--------|-------------|
| `redis_keyspace_hits_ratio` | Cache hit ratio |
| `redis_connected_clients` | Connection count |
| `redis_used_memory_bytes` | Memory usage |
| `redis_evicted_keys_total` | Evicted key count |
| `redis_commands_processed_total` | Command processing rate |

#### SQS Queues

Via `yet-another-cloudwatch-exporter` (YACE):

| Metric | Description |
|--------|-------------|
| `aws_sqs_approximate_number_of_messages_visible` | Queue depth |
| `aws_sqs_approximate_number_of_messages_not_visible` | In-flight messages |
| `aws_sqs_approximate_age_of_oldest_message_seconds` | Oldest message age |
| `aws_sqs_number_of_messages_sent` | Send rate |
| DLQ: same metrics above | Dead Letter Queue monitored separately |

### 2.4 EKS Cluster Layer

Via `kube-prometheus-stack` built-in `kube-state-metrics` + `node-exporter`:

| Metric | Description |
|--------|-------------|
| `kube_pod_status_phase` | Pod status distribution |
| `kube_pod_container_resource_requests/limits` | Resource request/limit |
| `node_cpu_seconds_total` | Node CPU utilization |
| `node_memory_MemAvailable_bytes` | Node available memory |
| `node_disk_io_time_seconds_total` | Disk I/O |
| `kube_deployment_status_replicas_available` | Available replicas |
| `kube_hpa_status_current_replicas` | HPA current replicas |

### 2.5 Network Layer

| Metric | Source | Description |
|--------|--------|-------------|
| `nginx_ingress_controller_requests` | ingress-nginx exporter | Ingress request count |
| `nginx_ingress_controller_request_duration_seconds` | ingress-nginx exporter | Ingress latency |
| `aws_alb_target_response_time` | YACE | ALB target response time |
| `aws_alb_healthy_host_count` | YACE | ALB healthy host count |
| `coredns_dns_request_duration_seconds` | CoreDNS metrics | DNS resolution latency |

### 2.6 CI/CD Layer

| Metric | Source | Description |
|--------|--------|-------------|
| `argocd_app_sync_status` | ArgoCD metrics | App sync status |
| `argocd_app_health_status` | ArgoCD metrics | App health status |
| `rollout_phase` | Argo Rollouts metrics (Phase 3) | Canary deployment phase |
| `rollout_canary_weight` | Argo Rollouts metrics (Phase 3) | Canary traffic weight |

---

## 3. Logs Design (Loki)

### 3.1 Collection Architecture

```
┌─────────────────────────────────────────────┐
│                 EKS Cluster                  │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │API Pod   │  │STT Pod  │  │LLM Pod  │    │
│  │ stdout/  │  │ stdout/ │  │ stdout/ │    │
│  │ stderr   │  │ stderr  │  │ stderr  │    │
│  └────┬─────┘  └────┬────┘  └────┬────┘    │
│       │              │            │          │
│  ┌────┴──────────────┴────────────┴────┐    │
│  │         Promtail (DaemonSet)         │    │
│  │  - Auto-discover Pod labels          │    │
│  │  - Attach K8s metadata               │    │
│  │  - Pipeline: JSON parse + relabel    │    │
│  └──────────────────┬──────────────────┘    │
│                     │                        │
│              ┌──────┴──────┐                 │
│              │    Loki     │                 │
│              │ (StatefulSet)│                 │
│              └──────┬──────┘                 │
│                     │                        │
│              ┌──────┴──────┐                 │
│              │   Grafana    │                 │
│              │  Explore UI  │                 │
│              └─────────────┘                 │
└─────────────────────────────────────────────┘
```

### 3.2 Structured JSON Log Format

All services output JSON to stdout:

```json
{
  "timestamp": "2026-03-04T10:30:00.123Z",
  "level": "info",
  "service": "stt-worker",
  "task_id": "uuid-1234",
  "trace_id": "abc123def456",
  "message": "task processing completed",
  "duration_ms": 5200,
  "model": "faster-whisper-large-v3",
  "audio_duration_s": 60,
  "status": "success"
}
```

#### Required Fields

| Field | All Services | Description |
|-------|-------------|-------------|
| `timestamp` | Yes | ISO 8601 format |
| `level` | Yes | debug / info / warn / error / fatal |
| `service` | Yes | Service name |
| `task_id` | Worker services | Task tracking ID |
| `trace_id` | Yes (Phase 3) | OpenTelemetry trace ID, reserve field in Phase 2 |
| `message` | Yes | Human-readable description |

#### Service-Specific Fields

| Service | Additional Fields |
|---------|------------------|
| API Service | `method`, `path`, `status_code`, `client_ip`, `request_id` |
| STT Worker | `audio_duration_s`, `model`, `duration_ms`, `error_code` |
| LLM Worker | `input_tokens`, `output_tokens`, `model`, `duration_ms`, `error_code` |

### 3.3 Loki Label Strategy

#### Static Labels (auto-attached by Promtail from K8s metadata)

| Label | Source | Example |
|-------|--------|---------|
| `namespace` | K8s namespace | `production`, `staging` |
| `pod` | K8s pod name | `api-service-7d8f9-x2k4` |
| `container` | Container name | `api`, `stt-worker` |
| `node` | K8s node name | `ip-10-0-1-42` |
| `app` | Pod label `app` | `api-service`, `stt-worker`, `llm-worker` |

#### Dynamic Labels (extracted by Promtail pipeline from JSON)

| Label | Description | Why suitable as Label |
|-------|-------------|----------------------|
| `level` | Log level | Low cardinality (5 values), commonly filtered |
| `service` | Service name | Low cardinality (3-5), commonly filtered |

#### NOT Labels (high cardinality — query via LogQL filter)

| Field | Reason | Query method |
|-------|--------|-------------|
| `task_id` | High cardinality | `{app="stt-worker"} \|= "uuid-1234"` |
| `trace_id` | High cardinality | `{app="api-service"} \| json \| trace_id="abc123"` |
| `client_ip` | High cardinality | `{app="api-service"} \| json \| client_ip="1.2.3.4"` |

### 3.4 Loki Deployment Mode

| Phase | Mode | Description |
|-------|------|-------------|
| Phase 2 | **Single Binary** (monolithic) | Single StatefulSet, simple, suitable for <100GB/day |
| Phase 3 | **Simple Scalable** (read/write/backend) | Read-write separation, horizontal scaling, for >100GB/day |

### 3.5 Log Retention Policy

| Level | Phase 2 | Phase 3 |
|-------|---------|---------|
| `error` / `fatal` | 30 days | 90 days |
| `warn` | 14 days | 30 days |
| `info` | 7 days | 14 days |
| `debug` | 3 days | 7 days |

Storage backend: Phase 2 uses EKS PV (gp3 EBS), Phase 3 migrates to S3 + DynamoDB index.

---

## 4. Alerting Design (P0 / P1 / P2)

### 4.1 Notification Routing

```
┌─────────────────────────────────────────────────┐
│              Grafana Alerting                     │
│                                                  │
│  ┌────────────────┐                              │
│  │  Alert Rules    │                              │
│  │  (per service)  │                              │
│  └───────┬────────┘                              │
│          │                                        │
│  ┌───────┴────────┐                              │
│  │ Notification    │                              │
│  │ Policies        │                              │
│  │                 │                              │
│  │  severity=P0 ──────▶ PagerDuty (Critical)     │
│  │                 │     + Slack #incident        │
│  │                 │                              │
│  │  severity=P1 ──────▶ PagerDuty (Warning)      │
│  │                 │     + Slack #alerts          │
│  │                 │                              │
│  │  severity=P2 ──────▶ Slack #ops-info only     │
│  │                 │                              │
│  └─────────────────┘                              │
└─────────────────────────────────────────────────┘
```

### 4.2 Alert Tier Definitions

#### P0 — Critical (PagerDuty Immediate + Slack #incident)

Requires immediate human intervention. Service is down or about to be.

| Alert Rule | Condition | Duration |
|-----------|-----------|----------|
| Service completely unavailable | `up{job="api-service"} == 0` all instances | 2 min |
| DLQ message accumulation | `aws_sqs_approximate_number_of_messages_visible{queue=~".*-dlq"} > 0` | 1 min |
| All GPU nodes offline | `count(DCGM_FI_DEV_GPU_UTIL) == 0` | 3 min |
| API error rate spike | `5xx_rate / total_rate > 0.2` | 3 min |
| Database connection exhaustion | `pg_stat_activity_count / pg_settings_max_connections > 0.9` | 2 min |
| SQS message age too long | `oldest_message_age > 1800s` (30 min) | 5 min |

#### P1 — Warning (PagerDuty Low Urgency + Slack #alerts)

Service degraded but not down. Handle during business hours.

| Alert Rule | Condition | Duration |
|-----------|-----------|----------|
| Error rate elevated | `error_rate > 5%` (per service) | 5 min |
| API P99 latency high | `histogram_quantile(0.99, ...) > 3s` | 5 min |
| STT processing time anomaly | `histogram_quantile(0.95, stt_processing_duration) > 15s` | 5 min |
| GPU utilization sustained high | `DCGM_FI_DEV_GPU_UTIL > 85` | 10 min |
| SQS queue depth growing | `queue_depth > 1000` | 5 min |
| Redis memory high | `used_memory / maxmemory > 0.8` | 5 min |
| Pod frequent restarts | `restart increase in 1h > 3` | Immediate |
| ArgoCD sync failed | `sync_status == OutOfSync` | 10 min |

#### P2 — Info (Slack #ops-info only)

Worth attention but not urgent. For trend analysis and capacity planning.

| Alert Rule | Condition | Duration |
|-----------|-----------|----------|
| Cache hit ratio drop | `redis_keyspace_hits_ratio < 0.8` | 15 min |
| Disk usage high | `available / total < 0.2` | 10 min |
| GPU temperature high | `DCGM_FI_DEV_GPU_TEMP > 80` | 10 min |
| RDS replication lag | `pg_replication_lag_seconds > 5` (Phase 3) | 10 min |
| Canary rollout paused | `rollout_phase == Paused` (Phase 3) | 5 min |
| Node CPU high | `node_cpu_utilization > 75%` | 15 min |

### 4.3 PagerDuty Integration

#### On-Call Rotation

```
┌──────────────────────────────┐
│      PagerDuty Service       │
│    "Heph-AI Production"      │
│                              │
│  Escalation Policy:          │
│  ┌────────────────────────┐  │
│  │ Level 1: On-call Eng    │  │
│  │ - 5 min no ack → esc    │  │
│  ├────────────────────────┤  │
│  │ Level 2: Tech Lead      │  │
│  │ - 10 min no ack → esc   │  │
│  ├────────────────────────┤  │
│  │ Level 3: Engineering    │  │
│  │          Manager        │  │
│  └────────────────────────┘  │
│                              │
│  Urgency Mapping:            │
│  - P0 → High (phone call)   │
│  - P1 → Low  (push notify)  │
└──────────────────────────────┘
```

#### PagerDuty Event Format

Via PagerDuty Integration API v2:

| Field | Value |
|-------|-------|
| `routing_key` | PagerDuty Integration Key |
| `severity` | `critical` (P0) / `warning` (P1) |
| `summary` | Alert rule name + trigger value |
| `source` | `grafana.heph-ai.production` |
| `component` | Triggering service name |
| `custom_details` | Grafana dashboard link + Loki log query link |

### 4.4 Alert Noise Reduction

| Mechanism | Description |
|-----------|-------------|
| **Grouping** | Merge alerts from same service (`group_by: [service, alertname]`) |
| **Inhibition** | P0 suppresses P1/P2 for same service |
| **Silence** | Manual silence for maintenance windows |
| **Repeat interval** | P0: every 5 min / P1: every 30 min / P2: every 4 hr |

---

## 5. Grafana Dashboard Design

### 5.1 Dashboard Hierarchy

```
Grafana
├── Overview
│   └── System Health Overview
├── Application Layer
│   ├── API Service Dashboard
│   ├── STT Worker Dashboard
│   └── LLM Worker Dashboard
├── GPU Layer
│   └── GPU Cluster Dashboard
├── Infrastructure Layer
│   ├── PostgreSQL Dashboard
│   ├── Redis Dashboard
│   └── SQS Queues Dashboard
├── Kubernetes Layer
│   ├── EKS Cluster Overview
│   └── Node & Pod Resources
├── Network Layer
│   └── Ingress & ALB Dashboard
├── CI/CD Layer
│   └── ArgoCD & Rollouts Dashboard (Phase 3)
└── Logs (Loki)
    └── Log Explorer (per service)
```

### 5.2 System Health Overview (Home)

```
┌─────────────────────────────────────────────────────────────┐
│                  System Health Overview                       │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  API Service │  STT Worker  │  LLM Worker  │  GPU Cluster    │
│  ● UP (3/3)  │  ● UP (2/2)  │  ● UP (2/2)  │  ● 2 GPUs OK   │
│  12 req/s    │  8 tasks/min │  25 tasks/min│  Util: 62%     │
│  P99: 120ms  │  P95: 5.2s   │  P95: 1.4s   │  Mem: 45%      │
├─────────────┴──────────────┴──────────────┴─────────────────┤
│                    Task Processing Pipeline                   │
│  ┌──────┐    ┌───────┐    ┌──────┐    ┌──────┐              │
│  │Upload│───▶│SQS-STT│───▶│SQS-LLM│──▶│ Done │              │
│  │48/min│    │depth:12│    │depth:3│   │45/min│              │
│  └──────┘    └───────┘    └──────┘    └──────┘              │
│                                                              │
│  Error Rate: 0.3%    DLQ: 0 msgs    Oldest Msg: 2s         │
├──────────────────────┬───────────────────────────────────────┤
│  PostgreSQL           │  Redis          │  SQS              │
│  Connections: 23/100  │  Hit Ratio: 94% │  STT Queue: 12   │
│  Query P95: 8ms       │  Memory: 1.2GB  │  LLM Queue: 3    │
│  Replication: N/A     │  Clients: 15    │  DLQ: 0          │
├──────────────────────┴───────────────────────────────────────┤
│  Active Alerts                                               │
│  (empty = healthy)                                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Dashboard Key Panels

#### API Service Dashboard

| Panel | Visualization | Data Source |
|-------|--------------|-------------|
| Request Rate (by status code) | Time series (stacked) | `rate(http_requests_total[5m])` |
| Latency Percentiles (P50/P95/P99) | Time series | `histogram_quantile(...)` |
| Error Rate % | Stat + threshold | `5xx / total * 100` |
| Requests In-Flight | Gauge | `http_requests_in_flight` |
| Top 5 Slowest Endpoints | Table | `topk(5, ...)` |
| Logs Panel | Logs (Loki) | `{app="api-service"}` |

#### STT Worker Dashboard

| Panel | Visualization | Data Source |
|-------|--------------|-------------|
| Tasks Processed / min | Time series | `rate(stt_tasks_processed_total[5m]) * 60` |
| Processing Duration (P50/P95) | Time series | `histogram_quantile(...)` |
| Success vs Failure Rate | Pie chart | `stt_tasks_processed_total` by status |
| Queue Consumer Lag | Time series | `stt_queue_consumer_lag` |
| Audio Duration Distribution | Histogram | `stt_audio_duration_seconds` |
| GPU Utilization | Gauge | `DCGM_FI_DEV_GPU_UTIL` |
| Logs Panel | Logs (Loki) | `{app="stt-worker"}` |

#### LLM Worker Dashboard

| Panel | Visualization | Data Source |
|-------|--------------|-------------|
| Tasks Processed / min | Time series | `rate(llm_tasks_processed_total[5m]) * 60` |
| Processing Duration (P50/P95) | Time series | `histogram_quantile(...)` |
| Token Throughput (in/out) | Time series (stacked) | `rate(llm_*_tokens_total[5m])` |
| Success vs Failure Rate | Pie chart | `llm_tasks_processed_total` by status |
| Queue Consumer Lag | Time series | `llm_queue_consumer_lag` |
| GPU Utilization | Gauge | `DCGM_FI_DEV_GPU_UTIL` |
| Logs Panel | Logs (Loki) | `{app="llm-worker"}` |

#### GPU Cluster Dashboard

| Panel | Visualization | Data Source |
|-------|--------------|-------------|
| GPU Utilization (per GPU) | Time series | `DCGM_FI_DEV_GPU_UTIL` |
| GPU Memory Usage (per GPU) | Time series | `DCGM_FI_DEV_MEM_USED` |
| GPU Temperature (per GPU) | Time series + threshold | `DCGM_FI_DEV_GPU_TEMP` |
| Power Usage | Time series | `DCGM_FI_DEV_POWER_USAGE` |
| GPU Count (healthy) | Stat | `count(DCGM_FI_DEV_GPU_UTIL)` |

### 5.4 Template Variables

| Variable | Query | Purpose |
|----------|-------|---------|
| `$namespace` | `label_values(namespace)` | Switch production / staging |
| `$service` | `label_values(app)` | Filter specific service |
| `$interval` | `1m, 5m, 15m, 1h` | Adjust aggregation window |
| `$gpu_node` | `label_values(DCGM_FI_DEV_GPU_UTIL, node)` | Filter GPU node |

### 5.5 Metrics → Logs Data Links

| From | Jump to | Link Template |
|------|---------|---------------|
| API Error Rate spike | API error logs | `{app="api-service",level="error"}` |
| STT Processing anomaly | STT Worker logs | `{app="stt-worker"} \|= "${task_id}"` |
| GPU Temp anomaly | Node logs | `{node="${node}"}` |

Phase 3 adds Logs → Traces navigation via `trace_id` field.

---

## 6. Distributed Tracing (Phase 3 — Tempo + OpenTelemetry)

### 6.1 Trace Propagation Path

```
Trace: task-upload-to-completion
│
├── Span: API.HandleUpload (api-service)
│   ├── duration: 45ms
│   ├── attributes: method=POST, path=/api/tasks, task_id=uuid-1234
│   ├── Span: DB.InsertTask (api-service → PostgreSQL)
│   │   └── duration: 8ms
│   ├── Span: Cache.Set (api-service → Redis)
│   │   └── duration: 2ms
│   └── Span: SQS.SendMessage (api-service → SQS STT Queue)
│       └── duration: 12ms
│
├── Span: STTWorker.ProcessTask (stt-worker)
│   ├── duration: 5200ms
│   ├── Span: Model.Inference (stt-worker → whisper-server)
│   │   └── duration: 5100ms
│   ├── Span: DB.UpdateTask (stt-worker → PostgreSQL)
│   │   └── duration: 6ms
│   └── Span: SQS.SendMessage (stt-worker → SQS LLM Queue)
│       └── duration: 10ms
│
└── Span: LLMWorker.ProcessTask (llm-worker)
    ├── duration: 1400ms
    ├── Span: Model.Inference (llm-worker → vllm-server)
    │   └── duration: 1300ms
    ├── Span: DB.UpdateTask (llm-worker → PostgreSQL)
    │   └── duration: 5ms
    └── Span: Cache.Set (llm-worker → Redis)
        └── duration: 2ms
```

### 6.2 Trace Context Propagation

| Boundary | Method | Description |
|---------|--------|-------------|
| HTTP (API → external) | W3C Trace Context header | `traceparent: 00-{trace_id}-{span_id}-01` |
| SQS (API → Worker) | SQS Message Attributes | `trace_id`, `span_id` in message attributes |
| Worker → Model Server | HTTP header | W3C Trace Context |
| Worker → DB/Redis | OTel SDK auto-instrumentation | Go OTel library auto-inject |

### 6.3 Tail-Based Sampling

| Rule | Sample Rate | Reason |
|------|------------|--------|
| Error traces | 100% | Must retain all error traces |
| Slow traces (duration > 10s) | 100% | Anomalous requests need investigation |
| Normal traces | 10% | Sampling sufficient for normal traffic |
| Health check traces | 0% | `/health` endpoints not needed |

### 6.4 Three Pillars Correlation — Exemplars

```
Metrics ←──── Exemplars ────→ Traces
   │                            │
   │         trace_id           │
   │                            │
   └──── Data Links ────→ Logs ─┘
         {task_id}        {trace_id}
```

| Navigation Path | Mechanism | Example |
|----------------|-----------|---------|
| Metric → Trace | Prometheus Exemplars | Click anomalous point on latency histogram → open trace |
| Metric → Log | Grafana Data Links | Error rate spike → jump to Loki error logs |
| Log → Trace | Derived Fields | `trace_id` in log → click to open Tempo trace view |
| Trace → Log | Tempo → Loki link | Trace span → jump to logs for that time + service |

### 6.5 Tempo Deployment

| Item | Setting |
|------|---------|
| Deployment mode | Distributed (ingester + querier + compactor) |
| Storage backend | S3 |
| Retention | 14 days |
| Helm chart | `grafana/tempo-distributed` |

---

## 7. Storage, Capacity & Cost

### 7.1 Phase 2 Resource Requirements

| Component | Replicas | CPU Request | Memory Request | Storage |
|-----------|----------|------------|----------------|---------|
| Prometheus | 1 | 500m | 2Gi | 50Gi gp3 EBS |
| Grafana | 1 | 250m | 512Mi | 10Gi gp3 EBS |
| Loki (monolithic) | 1 | 500m | 1Gi | 100Gi gp3 EBS |
| Promtail (DaemonSet) | per node | 100m | 128Mi | — |
| nvidia-dcgm-exporter | per GPU node | 100m | 128Mi | — |
| postgres_exporter | 1 | 50m | 64Mi | — |
| redis_exporter | 1 | 50m | 64Mi | — |
| YACE | 1 | 100m | 128Mi | — |

**Phase 2 observability cost: ~$183/month**

| Item | Monthly Cost |
|------|-------------|
| EKS node resources (~2 vCPU + 4Gi) | ~$70 |
| EBS storage (160Gi gp3) | ~$13 |
| PagerDuty (Professional, 5 users) | ~$100 |
| **Total** | **~$183** |

### 7.2 Phase 3 Resource Requirements

| Component | Replicas | CPU Request | Memory Request | Storage |
|-----------|----------|------------|----------------|---------|
| Prometheus | 2 (HA) | 1000m each | 4Gi each | S3 (remote write) |
| Grafana | 2 (HA) | 500m each | 1Gi each | PostgreSQL (shared) |
| Loki (read/write/backend) | 3+3+1 | 500m each | 1Gi each | S3 + DynamoDB |
| Tempo (distributed) | 3+2+1 | 500m each | 1Gi each | S3 |
| OTel Collector | 2 | 500m each | 1Gi each | — |
| Promtail (DaemonSet) | per node | 100m | 128Mi | — |
| nvidia-dcgm-exporter | per GPU node | 100m | 128Mi | — |
| Exporters (same as Phase 2) | — | — | — | — |

**Phase 3 observability cost: ~$502/month**

| Item | Monthly Cost |
|------|-------------|
| EKS node resources (~12 vCPU + 24Gi) | ~$350 |
| S3 storage (~500GB/month) | ~$12 |
| S3 API requests | ~$15 |
| DynamoDB (Loki index) | ~$25 |
| PagerDuty (Professional, 5 users) | ~$100 |
| **Total** | **~$502** |

### 7.3 Data Retention Summary

| Data Type | Phase 2 | Phase 3 | Storage Backend |
|-----------|---------|---------|----------------|
| Metrics (Prometheus) | 15d local | 15d local + 90d S3 | EBS → S3 |
| Logs — error/fatal | 30d | 90d | EBS → S3 |
| Logs — warn | 14d | 30d | EBS → S3 |
| Logs — info | 7d | 14d | EBS → S3 |
| Logs — debug | 3d | 7d | EBS → S3 |
| Traces | — | 14d | S3 |
| Dashboards | Git (as code) | Git (as code) | Git repo |
| Alert Rules | Git (as code) | Git (as code) | Git repo |

### 7.4 Grafana as Code

```
k8s/monitoring/
├── helm-values/
│   ├── kube-prometheus-stack.yaml
│   ├── loki-stack.yaml
│   └── tempo.yaml                  # Phase 3
├── dashboards/
│   ├── overview.json
│   ├── api-service.json
│   ├── stt-worker.json
│   ├── llm-worker.json
│   ├── gpu-cluster.json
│   ├── postgresql.json
│   ├── redis.json
│   ├── sqs-queues.json
│   ├── eks-cluster.json
│   ├── ingress-alb.json
│   └── argocd-rollouts.json        # Phase 3
├── alerting/
│   ├── p0-critical.yaml
│   ├── p1-warning.yaml
│   └── p2-info.yaml
└── provisioning/
    ├── datasources.yaml
    ├── dashboards.yaml
    └── notifiers.yaml              # PagerDuty + Slack
```

### 7.5 High Availability

| Component | Phase 2 | Phase 3 |
|-----------|---------|---------|
| Prometheus | Single instance + PV snapshot | 2 replicas HA + remote write to S3 |
| Grafana | Single instance | 2 replicas + shared PostgreSQL session |
| Loki | Single monolithic | Read/Write/Backend split, 3+ replicas each |
| Tempo | — | Distributed mode, 2+ replicas per component |
| Alerting | Grafana single (acceptable) | Grafana HA + deduplication |
