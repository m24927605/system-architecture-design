# Section 3: Architecture Characteristics

> Assignment: Scalability, fault tolerance, data consistency strategy, latency & performance, security, observability

---

## 3.1 Scalability

### Four-Layer Auto-Scaling (Phase 3)

```
Layer 1: KEDA              → Scale Worker Pods based on SQS queue depth
Layer 2: HPA               → Scale API Pods based on CPU utilization
Layer 3: GPU HPA           → Scale Model Server Pods based on GPU utilization
Layer 4: Cluster Autoscaler → Provision new EC2 Nodes when Pods are unschedulable
```

**Scaling chain reaction:**
1. Burst of tasks → SQS queue depth increases
2. KEDA detects queue depth > 10 → adds Worker Pods
3. More Workers → more pressure on GPU Servers → GPU utilization rises
4. GPU HPA detects utilization > 80% → adds GPU Pods
5. New GPU Pods need GPU Nodes → Cluster Autoscaler provisions new g5.xlarge EC2

**Why KEDA over HPA for Workers?**
- HPA scales on CPU → **reactive** (CPU is already high when scaling triggers)
- KEDA scales on SQS depth → **proactive** (sees queue backlog, scales before CPU spikes)
- Workers are I/O-bound — CPU stays low even when busy

### GPU Spot + On-Demand Mix

- **On-Demand:** Baseline capacity, guaranteed availability (e.g., 2 STT GPUs)
- **Spot:** Burst capacity, 40-60% savings (e.g., additional 2 STT GPUs)
- When Spot is reclaimed: SQS visibility timeout expires → message auto-redelivered → another Worker picks it up

---

## 3.2 Fault Tolerance

### Failure Scenarios and Mitigation

| Failure Scenario | Impact | Mitigation | Recovery Time |
|-----------------|--------|------------|---------------|
| **Worker crash mid-task** | Task stuck | SQS visibility timeout expires → auto-redelivery | Visibility timeout (5 min) |
| **Model server unresponsive** | Worker blocked | Timeout (30s) + exponential backoff (3 attempts) + Circuit Breaker | Immediate failover |
| **Retry exhausted** | Task permanently failed | Message → DLQ → CloudWatch Alarm → PagerDuty | Minutes (alert) to hours (manual) |
| **RDS primary failure** | DB writes fail | Multi-AZ automatic failover | < 60 seconds |
| **Redis node failure** | Cache miss | Multi-AZ failover; app falls back to DB | < 30 seconds |
| **Entire AZ outage** | Partial capacity loss | EKS Pods across AZs; ALB routes around unhealthy AZ | Seconds (automatic) |
| **GPU Spot reclaimed** | Processing capacity reduced | Cluster Autoscaler launches replacement; SQS redelivers in-flight messages | 2-5 minutes |

### Three Key Fault Tolerance Mechanisms

1. **SQS Visibility Timeout**
   - Set to 2x maximum expected processing time (STT up to 2 min → timeout set to 5 min)
   - Worker dies → message becomes visible again → another Worker picks it up

2. **Idempotent Processing**
   - Redis `SETNX task:{id}:stt lock_value EX 300`
   - Lock exists → message is a duplicate → ACK and skip
   - Prevents double-processing on SQS redelivery

3. **Circuit Breaker**
   - Applied to Model Server HTTP calls
   - Error rate > 50% in 30-second window → circuit opens → fast-fail for 60 seconds
   - Prevents cascading failures when Model Server is degraded

---

## 3.3 Data Consistency

### Write-then-ACK Pattern

```
1. Receive SQS message
2. Redis SETNX idempotency lock → if lock exists, ACK + skip
3. Call Model Server
4. Write result to PostgreSQL (in transaction)  ← Write to DB first
5. ACK SQS message (delete)                     ← Then ACK
6. Invalidate Redis cache
```

**Why this order matters:**
- ACK first, then write DB → crash after ACK but before write → message deleted, result lost → **data loss**
- Write DB first, then ACK → crash after write but before ACK → message redelivered → idempotency lock prevents re-processing → **safe**

### Optimistic Locking

```sql
BEGIN;
UPDATE tasks SET status = 'llm_processing', transcript = $1, updated_at = NOW()
WHERE id = $2 AND status = 'stt_processing';  -- status condition = optimistic lock
COMMIT;
```

- `WHERE status = 'stt_processing'` is a conditional update
- If status already advanced by another Worker → UPDATE affects 0 rows → Worker knows to skip
- No pessimistic locks (SELECT FOR UPDATE), avoiding lock contention

### Why Not 2PC (Two-Phase Commit)?

- 2PC across SQS and PostgreSQL is not feasible (SQS doesn't support XA)
- Write-then-ACK + idempotency = at-least-once delivery + exactly-once processing
- This is the industry-standard consistency pattern for message queue systems

---

## 3.4 Latency & Performance

### Latency Breakdown

| Operation | Latency | Notes |
|-----------|---------|-------|
| Upload → receive task_id | < 200ms | API writes DB + sends SQS + returns |
| STT processing (1-min audio) | ~5-10 seconds | GPU inference + overhead |
| LLM summarization | ~2-5 seconds | vLLM continuous batching |
| **End-to-end (no queue wait)** | **~10-20 seconds** | Under low load |
| **End-to-end (with queue wait)** | **Seconds to minutes** | Depends on queue depth and GPU capacity |
| Query result (cache hit) | < 5ms | Redis GET |
| Query result (cache miss) | < 50ms | PostgreSQL SELECT with index |

### Performance Optimization Strategies

| Strategy | Mechanism | Impact |
|----------|-----------|--------|
| **Async Processing** | API returns task_id immediately, doesn't wait for GPU | Users are never blocked |
| **S3 Presigned URL** | Audio uploads directly to S3, bypasses API server | Eliminates API bandwidth bottleneck |
| **vLLM Continuous Batching** | Dynamically batches multiple concurrent LLM requests | 3-5x throughput improvement |
| **Redis Cache** | Completed task results cached in Redis | Query latency < 5ms |
| **Connection Pooling** | Persistent connections to DB, Redis, Model Servers | Eliminates per-request connection overhead |

---

## 3.5 Security

| Layer | Measure | Details |
|-------|---------|---------|
| **API Auth** | JWT (short-lived) + API Keys | JWT for user sessions, API keys for service-to-service |
| **S3 Access** | Presigned URLs (15-min expiry) | Bucket policy denies all public access |
| **Transport Encryption** | End-to-end HTTPS/TLS | TLS 1.2+ terminated at ALB, VPC internal traffic encrypted |
| **At-rest Encryption** | S3 SSE-S3, RDS storage encryption | AES-256, enabled by default on all data stores |
| **Network Isolation** | VPC private subnets | Model Servers, DBs, Redis in private subnets; only ALB is public |
| **Rate Limiting** | Redis sliding window | 100 req/min/user |
| **File Validation** | MIME type + size check | Accept only audio/* MIME types, max 500MB |
| **Secrets Management** | AWS Secrets Manager | Injected via EKS CSI Driver, never in ConfigMaps or code |

---

## 3.6 Observability

### Three Pillars

| Dimension | Tool | What to Monitor |
|-----------|------|----------------|
| **Metrics** | Prometheus + Grafana | Task processing rate, SQS queue depth, API P95/P99, GPU utilization, error rate, cache hit ratio |
| **Logs** | Loki (structured JSON) | Per-task processing chain, error stack traces, model response codes |
| **Traces** | OpenTelemetry + Tempo | End-to-end trace: API → SQS → Worker → Model → DB |
| **Alerting** | Grafana Alerting → PagerDuty / Slack | DLQ > 0, error rate > 5%, P99 > threshold, GPU nodes < minimum |

### Task-Level Tracing

- Every task is assigned a `trace_id` at creation time
- trace_id propagates through SQS message attributes
- In Grafana, search by task_id to see complete processing timeline:
  ```
  API request → queue wait → STT inference → LLM inference → DB write
  ```
- Latency breakdown at each step for bottleneck identification
