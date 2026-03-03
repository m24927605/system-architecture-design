# Section 2: Technology Selection & Rationale

> Assignment: Explain the rationale for selected technologies (language, framework, database, message queue, etc.) and compare with alternatives

---

## Language & Framework

### Why Go for Everything?

| Aspect | Go Advantage | Comparison |
|--------|-------------|------------|
| **Concurrency** | Goroutine ~2KB each, millions possible | Java Thread ~1MB each |
| **Deployment** | Single binary, Docker image ~10MB | Python needs requirements + venv |
| **Memory** | Worker Pod ~30-50MB | Python Worker ~200-500MB |
| **Startup** | < 100ms | Java cold start takes seconds |
| **I/O Wait** | Goroutines excel at HTTP waiting | Python GIL limits true parallelism |

**Key argument: Workers don't run ML models**

Worker workflow:
1. Poll message from SQS
2. Send HTTP request to Model Server
3. Wait for response
4. Write to DB
5. ACK message

This is purely I/O-bound work. Go's goroutine model is a perfect match. Python's ML ecosystem is irrelevant here.

### Why Echo Framework?

- Lightweight yet feature-complete (middleware: auth, CORS, rate limiting, recovery)
- Performance close to net/http, richer middleware ecosystem than Gin
- Built-in graceful shutdown, request validation

---

## Database: RDS PostgreSQL

**Why not Aurora?**
- Aurora costs ~3x more than PostgreSQL
- Our task table structure is simple — no need for Aurora's 6-way replication
- PostgreSQL ACID + TOAST (for large TEXT) is sufficient

**Why not DynamoDB?**
- Tasks have a clear state machine (pending → stt_processing → llm_processing → done)
- Need `WHERE status = 'xxx'` queries
- Need transactional updates (status + transcript in a single TX)
- DynamoDB is poor at relational queries

**Schema design decisions:**
```sql
status VARCHAR(20)     -- Not ENUM, easy to add new states without migration
transcript TEXT         -- PostgreSQL TEXT has no practical size limit, TOAST auto-handles
retry_count INT         -- DB tracking for observability; actual retry driven by SQS maxReceiveCount
```

---

## Message Queue: SQS

### SQS vs Kafka vs RabbitMQ

| Aspect | SQS | Kafka | RabbitMQ |
|--------|-----|-------|----------|
| **Ops Cost** | Fully managed, zero ops | Requires cluster mgmt or MSK (~$200+/mo) | Requires self-hosting or AmazonMQ |
| **Semantics** | Task Queue (process once, delete) | Event Stream (needs replay) | Complex routing patterns |
| **DLQ** | Built-in natively | Must implement manually | Native support |
| **KEDA Integration** | Native SQS scaler | Kafka scaler available | RabbitMQ scaler available |
| **Cost at 500K msgs/mo** | ~$0.20 | ~$200+ | ~$50+ |

**Decision logic:**
- Our use case is a Task Queue, not an Event Stream
- Each message is processed once then deleted — no replay needed
- No strict ordering required (tasks are independent)
- SQS cost is near-zero with zero operational burden

> **Local dev uses RabbitMQ:** docker-compose runs RabbitMQ as a drop-in replacement for SQS. The worker code abstracts the queue interface, making the switch transparent.

---

## AI Model Deployment Strategy

### Three-Phase Model Strategy

| Phase | STT Solution | LLM Solution | Rationale |
|-------|-------------|-------------|-----------|
| **MVP** | AWS Transcribe | Amazon Bedrock | Zero GPU ops, fast time-to-market |
| **Growth** | Self-hosted faster-whisper (1 GPU) | Self-hosted vLLM 7B (1 GPU) | Cheaper after cost crossover |
| **Scale** | Multi-GPU pool + Spot | Multi-GPU pool + Spot | Horizontal scaling + cost optimization |

### Cost Crossover Analysis (Critical!)

| Monthly Volume | Managed Service Cost | Self-Hosted GPU Cost | Difference |
|---------------|---------------------|---------------------|------------|
| 10K | ~$270 | ~$840 | Managed is 68% cheaper |
| 30K | ~$810 | ~$840 | **Break-even** |
| 50K | ~$1,350 | ~$840 | Self-hosted is 38% cheaper |
| 100K | ~$2,700 | ~$840 | Self-hosted is 69% cheaper |
| 500K | ~$13,500 | ~$2,520 | Self-hosted is 81% cheaper |

**Underlying numbers:**
- AWS Transcribe: $0.024/minute
- g5.xlarge (A10G): ~$420/month
- 1 STT GPU handles ~10-12 tasks/min → ~432K tasks/month (100% utilization)

**Key insight:**
- Managed services have **linear cost** (each task costs the same)
- Self-hosted GPU has **fixed cost** (running at full vs. half capacity costs the same)
- Low volume → GPU idle waste; high volume → marginal cost per task approaches zero

---

## Cache: ElastiCache Redis

**Used for more than just caching:**

| Use Case | Mechanism |
|----------|-----------|
| **Result Cache** | Cache-aside pattern for GET /tasks/{id} |
| **Idempotency Lock** | `SETNX task:{id}:stt lock_value EX 300` to prevent duplicate processing |
| **Rate Limiting** | Sliding window counter, 100 req/min/user at API layer |
| **Distributed Lock** | Worker deduplication when consuming messages |

---

## Container Orchestration: ECS → EKS Evolution

| Aspect | ECS Fargate (Phase 1) | EKS (Phase 2+) |
|--------|----------------------|----------------|
| **Ops** | Zero (no cluster management) | Moderate (node group mgmt) |
| **GPU Support** | None | Native GPU node groups |
| **Auto-scaling** | ECS Service Auto Scaling | HPA + KEDA + Cluster Autoscaler |
| **Deployment** | Rolling Update only | Argo Rollouts Canary |
| **Cost** | Per-second billing, efficient at small scale | Control plane $73/mo, efficient at large scale |
