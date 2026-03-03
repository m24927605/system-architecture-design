# Section 1: Architecture Design

> Assignment: System architecture diagram, Sequence Diagram, Service boundary definition

---

## Core Design Philosophy

A **3-phase evolutionary architecture** (MVP → Growth → Scale) instead of designing for maximum scale from day one.

**Why not design the final version upfront?**
- Over-engineering wastes resources (idle GPU cost is high)
- Each phase is a fully deployable, standalone system
- Upgrade triggers are explicit and measurable (cost thresholds, GPU utilization, SQS queue depth)

---

## Three-Phase Architecture Overview

| Dimension | Phase 1: MVP | Phase 2: Growth | Phase 3: Scale |
|-----------|-------------|-----------------|----------------|
| **Monthly Cost** | $800-1,500 | $3,000-6,000 | $10,000-25,000 |
| **Cost per Task** | ~$0.027 | ~$0.008-0.012 | ~$0.004-0.008 |
| **Processing Throughput** | ~50 tasks/min | ~10-50 tasks/min (sustained) | ~1,000+ tasks/min |
| **Compute** | ECS Fargate | EKS | EKS + KEDA + Cluster Autoscaler |
| **AI Models** | AWS Transcribe + Bedrock | Self-hosted Whisper + vLLM (1 GPU each) | Multi-GPU pool (Spot + On-Demand) |
| **Deployment** | ECS Rolling Update | EKS Rolling Update | Argo Rollouts Canary |
| **Observability** | CloudWatch | Prometheus + Grafana | Full stack: Prometheus + Grafana + Loki + OTel + Tempo |

---

## Phase 1: MVP Architecture

**Target:** ~50 tasks/min | < 50K tasks/month | POC validation

```
User → API (ECS Fargate, Go+Echo)
         ├── S3 (presigned URL for direct audio upload)
         ├── PostgreSQL (INSERT task, status=pending)
         ├── Redis (SET cache)
         └── SQS (send STT message)

SQS → STT Worker (ECS Fargate)
         ├── Call AWS Transcribe
         ├── UPDATE PostgreSQL (transcript)
         └── Send LLM message → SQS

SQS → LLM Worker (ECS Fargate)
         ├── Call Amazon Bedrock
         ├── UPDATE PostgreSQL (summary, status=done)
         └── Invalidate Redis cache

User → API → Redis (cache hit) or PostgreSQL (cache miss) → Return result
```

**Why ECS Fargate instead of EKS for MVP?**
- No GPU needed, no reason to introduce K8s complexity
- Fargate: zero cluster management, per-second billing
- EKS control plane costs $73/month — not justified at small scale

**Why managed AI services for MVP?**
- Zero GPU operations
- Pay-per-call pricing is cheaper at low volume
- Validate the product first, optimize infrastructure later

---

## Phase 2: Growth Architecture

**Target:** ~200 tasks/min (burst) | 50K-500K tasks/month | Proven product-market fit

**Key changes:**
- ECS Fargate → **EKS** (GPU node group support)
- AWS Transcribe → **Self-hosted faster-whisper** (1 GPU)
- Amazon Bedrock → **Self-hosted vLLM 7B** (1 GPU)
- Single SQS → **Two-stage SQS** (STT Queue + LLM Queue)
- Added **Prometheus + Grafana** monitoring

**Cost crossover analysis:**
- < 30K tasks/month: Managed services are cheaper (GPU sits idle)
- ~30K-50K tasks/month: **Break-even**
- > 50K tasks/month: Self-hosted starts saving, gap widens rapidly
- At 500K tasks/month, self-hosted is **81% cheaper**

---

## Phase 3: Scale Architecture

**Target:** ~1,000+ tasks/min | 500K+ tasks/month

**Key changes:**
- HPA (CPU-based) → **KEDA** (SQS queue depth driven)
- Fixed GPU → **Multi-GPU pool** (Spot + On-Demand mix)
- Rolling Update → **Argo Rollouts Canary** (10% → 30% → 100%)
- Basic monitoring → **Full observability** (Prometheus + Loki + OTel + Tempo)
- Hardcoded STT/LLM → **Plug-in TaskProcessor interface** (extensible AI task types)

---

## Sequence Diagram Key Points

The task flow is **logically identical** across all three phases — only the underlying infrastructure changes:

```
1. User → POST /tasks → API receives request
2. API → S3 presigned URL (audio uploads directly to S3, bypasses API server)
3. API → PostgreSQL INSERT (status=pending)
4. API → SQS Send Message → Immediately returns 201 {task_id}
   (API response complete here, < 200ms)

5. STT Worker polls SQS message
6. Redis SETNX idempotency lock (prevent duplicate processing)
7. Call STT model → get transcript
8. PostgreSQL UPDATE (transcript, status=llm_processing)
9. Send LLM message to SQS → ACK original message

10. LLM Worker polls SQS message
11. Redis SETNX idempotency lock
12. Read transcript from PostgreSQL
13. Call LLM model → get summary
14. PostgreSQL UPDATE (summary, status=done) → ACK message

15. User → GET /tasks/{id} → Redis cache hit (< 5ms) or DB fallback
```

**Key pattern: Write-then-ACK**
- Write to DB first, then ACK the message
- If worker crashes after DB write but before ACK → message redelivered → idempotency lock prevents re-processing
- If worker crashes before DB write → message redelivered → normal reprocessing

---

## Service Boundaries

| Service | Responsibility | Communication | Scaling |
|---------|---------------|---------------|---------|
| **API Service** | Accept requests, generate presigned URLs, create tasks, query results | HTTP (sync) | HPA (CPU) |
| **STT Worker** | Consume STT Queue, call STT model, write transcript | SQS (async) | KEDA (SQS depth) |
| **LLM Worker** | Consume LLM Queue, call LLM model, write summary | SQS (async) | KEDA (SQS depth) |
| **STT Model Server** | Speech-to-text inference | HTTP (internal) | GPU HPA |
| **LLM Model Server** | Text summarization inference | HTTP (internal) | GPU HPA |

**Why separate Workers from Model Servers?**
- Workers are CPU services (HTTP calls, DB operations only)
- Model Servers are GPU services (run inference)
- Different scaling logic: Workers scale by queue depth, GPUs scale by utilization
- Worker crash doesn't affect GPU service, and vice versa
