# Section 4: Deployment & Operations

> Assignment: Dev/Staging/Prod deployment topology, CI/CD flow, version update and rollback strategy

---

## 4.1 Deployment Topology: Dev / Staging / Prod

Three environments map to separate AWS accounts (account isolation):

| Environment | Infrastructure | GPU | Model Services | Database | Monthly Cost | Purpose |
|-------------|---------------|-----|---------------|----------|-------------|---------|
| **Dev** | Local docker-compose or ECS Fargate (1 task) | 0 | Mock servers | RDS db.t4g.micro (single) | ~$30 | Development, functional testing |
| **Staging** | EKS 3 nodes | 1× g5.xlarge | Real models (same version as Prod) | RDS single-AZ | ~$800 | Integration testing, perf testing |
| **Prod** | EKS 6+ nodes, Multi-AZ | 4+ GPU nodes (Spot + On-Demand) | Self-hosted faster-whisper + vLLM | RDS Multi-AZ + Read Replica | Phase-dependent | Production |

### Design Principles

**Dev Environment:**
- Developers run `docker compose up` to get the full pipeline locally
- Mock services simulate latency (1-5s) and response format
- Architecture logic matches Prod — only the underlying services are mocked

**Staging Environment:**
- Miniature Prod: same images, same config structure, same architecture
- Difference is only in scale (1 GPU vs multi-GPU, 3 nodes vs 6+ nodes)
- Purposes:
  - Integration testing (real models — validate model version upgrades)
  - Performance testing (real GPU — validate latency SLAs)
  - Smoke testing (automated, as a gate in the CD pipeline)

**Account Isolation:**
- Dev / Staging / Prod each use independent AWS Accounts
- Managed via AWS Organizations
- Prevents Dev IAM changes from affecting Prod
- Terraform state is separate per account

---

## 4.2 CI/CD Flow

**GitHub Actions (CI) + ArgoCD (CD)** — GitOps architecture.

### CI Phase (GitHub Actions)

Triggered on every push to any branch:

```
1. golangci-lint          → Static analysis, code style enforcement
2. Unit Test              → go test ./... -race
3. Docker Build           → Verify image builds successfully
4. Security Scan          → Trivy scans image for CVE vulnerabilities
```

Additional checks on PR:

```
5. Integration Test       → docker-compose with full stack + mock models
                           → E2E test (create task → STT → LLM → query result)
```

### CD Phase (ArgoCD)

Triggered on merge to `main`:

```
6. Build & Push           → Docker image tag: git SHA (e.g., api:abc123f)
                           → Push to ECR
7. Auto-sync to Staging   → ArgoCD detects image tag update → auto-deploy
8. Staging Smoke Test     → Automated: create task → verify completion → check result
9. Manual Approval        → Human reviews Staging test results
10. Canary Deploy to Prod → Argo Rollouts progressive deployment
```

### Why ArgoCD?

| Aspect | ArgoCD | Jenkins CD | FluxCD |
|--------|--------|------------|--------|
| **GitOps** | Git is the single source of truth | Requires extra config | Also GitOps |
| **Visibility** | Built-in UI shows sync status | Needs extra dashboard | CLI-focused |
| **Rollback** | Sync to any git commit | Requires rollback pipeline | Equally easy |
| **Ecosystem** | Native Argo Rollouts integration | Needs plugins | Needs Flagger |

---

## 4.3 Version Update & Rollback Strategy

### Canary Deployment (Argo Rollouts)

Phase 3 uses Argo Rollouts for progressive deployment:

| Stage | Traffic Split | Duration | Health Check |
|-------|--------------|----------|-------------|
| Phase 1 | 10% canary / 90% stable | 5 minutes | error rate < 1%, P99 < threshold |
| Phase 2 | 30% canary / 70% stable | 5 minutes | Same |
| Phase 3 | 100% canary | — | Full cutover |

**How it works:**
1. Argo Rollouts creates canary Pods alongside stable Pods
2. ALB Ingress gradually shifts traffic: 10% → 30% → 100%
3. At each step, queries Prometheus for error rate and P99 latency
4. If metrics degrade → automatically routes traffic back to stable Pods → terminates canary
5. **No manual intervention required for rollback**

### Rollback Scenarios

| Scenario | Action | Impact |
|----------|--------|--------|
| **Canary metrics degrade** | Argo Rollouts auto-rollback | Only 10-30% of traffic affected, auto-recovery |
| **Post-release issue** | `kubectl argo rollouts undo <rollout>` or ArgoCD UI | Seconds to roll back to previous image |
| **DB migration issue** | Execute corresponding `down` migration | Requires coordination (migration must be backward-compatible) |
| **Emergency full rollback** | ArgoCD sync to specific git commit SHA | Return to known-good state |

### DB Migration Backward Compatibility

During canary deployment, old and new code versions **coexist**, so DB schema changes must:

| Operation | Safe? | Explanation |
|-----------|-------|-------------|
| **Add column** | Safe | Old code ignores new column |
| **Drop column** | Unsafe | Must split into 2 releases: stop using → then drop |
| **Rename column** | Unsafe | Equivalent to drop + add, must be done in steps |
| **Add NOT NULL** | Careful | Must have a default value first |

Migrations run as Kubernetes Jobs **before** the application deployment.

---

## 4.4 Key Operational Principles

### 1. Immutable Image Tags

```
✅ api:abc123f     (git SHA)
❌ api:latest      (never use)
```

- Ensures reproducible deployments (same tag = same content)
- Rollback targets are explicit
- ECR paired with image scanning

### 2. GitOps Single Source of Truth

```
All environment changes → modify Git repo → open PR → review → merge → ArgoCD auto-sync
```

- No `kubectl apply` directly on Prod
- All changes have audit trail (Git history)
- Entire environment can be rebuilt from Git at any time

### 3. Infrastructure as Code

- **Terraform** manages AWS resources (EKS, RDS, SQS, S3, etc.)
- Terraform state stored in S3 + DynamoDB lock
- Separate Terraform workspace or state per environment

### 4. Secrets Management

```
✅ AWS Secrets Manager → EKS CSI Driver → Pod environment variables
❌ In ConfigMaps, Dockerfiles, or source code
```

- DB passwords, API keys, Model Server credentials in Secrets Manager
- Auto-injected on Pod startup, no manual intervention
- Supports automatic rotation
