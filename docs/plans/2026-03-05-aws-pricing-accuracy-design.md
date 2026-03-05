# Design: Dynamic AWS Pricing & Capacity Calculator

**Date:** 2026-03-05
**Status:** Approved

## Problem

The current capacity calculator uses hardcoded cost constants that don't match actual AWS pricing, and the STT throughput formula ignores `avgAudioMinutes`, producing over-optimistic estimates.

Key issues:
- `GPU_COST_PER_MONTH = 420` → actual g5.xlarge On-Demand = ~$734/mo
- `BEDROCK_COST_PER_TASK = 0.003` → Bedrock charges per-token, varies by model
- `STT_TASKS_PER_GPU_PER_MIN = 10` → with 3-min audio + RTF 0.10, real value ≈ 3.3
- Phase 2 architecture metrics are hardcoded strings, disconnected from calculator

## Goals

- Production-grade: real AWS pricing, per-token Bedrock model, correct throughput formulas
- Dynamic: user-configurable model, RTF, audio length, with live visual updates
- Traceable: every cost number links to its AWS source
- Resilient: build-time snapshot fallback when runtime API unavailable

## Architecture

### 1. AWS Pricing Pipeline

#### 1a. Build-time Script (`scripts/fetch-aws-pricing.ts`)

Runs before `next build`. Fetches from AWS Price List API, outputs `web/src/data/aws-pricing-snapshot.json` (~5-10KB).

**Data sources:**
- EC2: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json` (filter g5 series)
- Transcribe: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonTranscribe/current/index.json`
- Bedrock: manual entry with `sourceUrl` pointing to official pricing page (no public Price List API)

**Output structure:**
```json
{
  "lastUpdated": "2026-03-05T08:00:00Z",
  "ec2": {
    "g5.xlarge": {
      "region": "us-east-1",
      "onDemand": 1.006,
      "reserved1yrNoUpfront": 0.636,
      "reserved1yrAllUpfront": 0.575,
      "sourceUrl": "https://aws.amazon.com/ec2/pricing/"
    }
  },
  "transcribe": {
    "standard": { "perMinute": 0.024, "sourceUrl": "https://aws.amazon.com/transcribe/pricing/" }
  },
  "bedrock": {
    "claude-3-haiku": { "inputPer1kTokens": 0.00025, "outputPer1kTokens": 0.00125, "sourceUrl": "https://aws.amazon.com/bedrock/pricing/" },
    "claude-3.5-sonnet": { "inputPer1kTokens": 0.003, "outputPer1kTokens": 0.015, "sourceUrl": "https://aws.amazon.com/bedrock/pricing/" },
    "llama3-8b": { "inputPer1kTokens": 0.0002, "outputPer1kTokens": 0.0002, "sourceUrl": "https://aws.amazon.com/bedrock/pricing/" }
  }
}
```

#### 1b. Runtime API Route (`app/api/pricing/route.ts`)

Next.js Route Handler. Server-side fetch with 24h cache. Returns same structure as snapshot. Fallback: returns snapshot on failure.

#### 1c. Client Hook (`hooks/useAwsPricing.ts`)

```typescript
useAwsPricing() → { pricing, lastUpdated, isLive }
```
- Initial: import build-time snapshot (zero-delay render)
- `useEffect`: fetch `/api/pricing`
- Success → override with live data, `isLive=true`
- Failure → keep snapshot, `isLive=false`

### 2. Enhanced Capacity Calculator

#### 2a. Input Parameters

```typescript
interface CapacityInput {
  monthlyTasks: number;
  avgAudioMinutes: number;
  whisperRtf: number;           // default 0.10, range 0.05-0.25
  bedrockModel: string;         // from pricing snapshot keys
  avgInputTokens: number;       // default 1500
  avgOutputTokens: number;      // default 500
  gpuTargetUtilization: number; // default 0.7
}
```

#### 2b. Corrected Formulas

**STT throughput (core fix):**
```
processingTimePerTask = avgAudioMinutes × 60 × whisperRtf  (seconds)
sttTasksPerGpuPerMin = 60 / processingTimePerTask
sttGpus = ceil(tasksPerMin / (sttTasksPerGpuPerMin × utilization))
```

**Bedrock cost (per-token):**
```
costPerTask = (avgInputTokens / 1000 × inputPer1kTokens)
            + (avgOutputTokens / 1000 × outputPer1kTokens)
totalBedrockCost = monthlyTasks × costPerTask
```

**GPU monthly cost (On-Demand default):**
```
gpuCostPerMonth = pricing.ec2["g5.xlarge"].onDemand × 730
```

#### 2c. Output Structure (dual-path comparison)

```typescript
interface CapacityResult {
  recommendedPhase: 1 | 2 | 3;
  phaseName: string;
  // Self-hosted
  sttGpus: number;
  llmGpus: number;
  selfHostedMonthlyCost: number;
  // Managed
  transcribeMonthlyCost: number;
  bedrockMonthlyCost: number;
  managedMonthlyCost: number;
  // Comparison
  savings: number;
  // Throughput (for dynamic architecture metrics)
  sttTasksPerMinPerGpu: number;
  totalSttCapacity: number;
}
```

### 3. UI Controls & Visualization

#### 3a. Control Panel

| Control | Type | Default | Range |
|---------|------|---------|-------|
| Monthly Tasks | slider + input | 10,000 | 1K – 2M |
| Avg Audio Length | slider | 3 min | 0.5 – 15 min |
| Whisper RTF | slider | 0.10 | 0.05 – 0.25 |
| Bedrock Model | dropdown | claude-3-haiku | dynamic from pricing |
| Avg Input Tokens | input | 1,500 | 100 – 10,000 |
| Avg Output Tokens | input | 500 | 50 – 5,000 |

Pricing badge (top-right):
- `isLive=true` → green "Live pricing · Updated {time}"
- `isLive=false` → yellow "Snapshot · {lastUpdated}"

#### 3b. Charts (recharts)

**Cost Comparison (Bar Chart):**
- Self-hosted (GPU + base infra) vs Managed (Transcribe + Bedrock + base infra)
- Savings % label on top

**Scale Curve (Line Chart):**
- X: monthly tasks (1K → 2M)
- Y: monthly cost
- Two lines: self-hosted vs managed
- Break-even point annotated

**Throughput Cards:**
- STT: `{sttTasksPerMinPerGpu}` tasks/min/GPU × `{sttGpus}` GPUs = `{totalSttCapacity}` tasks/min
- All values update in real-time with controls

#### 3c. Dynamic Architecture Metrics

Phase 2/3 `metrics` object reads from `CapacityResult`:

```typescript
metrics: {
  monthlyCost: `$${selfHostedMonthlyCost.toLocaleString()}`,
  throughput: `~${totalSttCapacity.toFixed(0)} tasks/min`,
  compute: "EKS",
  aiModels: `Whisper (RTF ${whisperRtf}) + ${bedrockModel}`,
}
```

### 4. Source Citations & Traceability

#### 4a. Inline Citations

Each cost number shows an info tooltip on hover:
- AWS service name + pricing page link
- Region (us-east-1)
- Pricing unit
- Data timestamp

#### 4b. Assumptions Panel

Collapsible "Assumptions" block below results:
- GPU hours: 730h/mo (24×30.4)
- Target utilization: 70%
- Whisper model: large-v3
- Token estimate: ~400 tokens/min transcription
- Base infra: ALB, RDS, ElastiCache, S3, CloudWatch

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `scripts/fetch-aws-pricing.ts` | Build-time pricing fetcher |
| Create | `web/src/data/aws-pricing-snapshot.json` | Fallback pricing data |
| Create | `web/src/app/api/pricing/route.ts` | Runtime pricing API |
| Create | `web/src/hooks/useAwsPricing.ts` | Client pricing hook |
| Modify | `web/src/data/capacity.ts` | Enhanced calculator with correct formulas |
| Modify | `web/src/data/architecture-nodes.ts` | Dynamic metrics from calculator |
| Modify | Capacity UI component(s) | New controls + charts |
| Modify | `web/package.json` | Add prebuild script |
