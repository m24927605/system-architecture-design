# AWS Pricing & Capacity Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded cost constants with dynamic AWS pricing, fix STT throughput formula, add configurable model/RTF controls, and wire dynamic metrics into architecture diagrams.

**Architecture:** Build-time script fetches AWS Price List API → outputs snapshot JSON. Next.js API route provides runtime refresh with 24h cache. Client hook merges live + fallback. Enhanced calculator uses corrected formulas. UI adds controls + recharts visualizations. Architecture metrics read from calculator output via React context.

**Tech Stack:** Next.js 16 (App Router), TypeScript, recharts, next-intl, framer-motion, Tailwind CSS

---

### Task 1: AWS Pricing Type Definitions

**Files:**
- Create: `web/src/types/aws-pricing.ts`

**Step 1: Create pricing type definitions**

```typescript
// web/src/types/aws-pricing.ts

export interface Ec2Pricing {
  region: string;
  onDemandPerHour: number;
  reserved1yrNoUpfrontPerHour: number;
  reserved1yrAllUpfrontPerHour: number;
  sourceUrl: string;
}

export interface TranscribePricing {
  perMinute: number;
  sourceUrl: string;
}

export interface BedrockModelPricing {
  displayName: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  sourceUrl: string;
  manualEntry?: boolean;
}

export interface AwsPricingSnapshot {
  lastUpdated: string;
  ec2: Record<string, Ec2Pricing>;
  transcribe: { standard: TranscribePricing };
  bedrock: Record<string, BedrockModelPricing>;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors related to `aws-pricing.ts`

**Step 3: Commit**

```bash
git add web/src/types/aws-pricing.ts
git commit -m "feat: add AWS pricing type definitions"
```

---

### Task 2: Build-time Pricing Fetch Script

**Files:**
- Create: `scripts/fetch-aws-pricing.ts`
- Create: `web/src/data/aws-pricing-snapshot.json` (output)

**Step 1: Create the fetch script**

```typescript
// scripts/fetch-aws-pricing.ts
//
// Usage: npx tsx scripts/fetch-aws-pricing.ts
// Fetches EC2 and Transcribe pricing from AWS Price List API,
// merges with manually-maintained Bedrock prices,
// outputs to web/src/data/aws-pricing-snapshot.json

import { writeFileSync } from "fs";
import { resolve } from "path";

const OUTPUT_PATH = resolve(
  __dirname,
  "../web/src/data/aws-pricing-snapshot.json"
);

const EC2_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json";
const TRANSCRIBE_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonTranscribe/current/index.json";

// Bedrock has no public Price List API — maintain manually with source URLs
const BEDROCK_MANUAL: Record<
  string,
  {
    displayName: string;
    inputPer1kTokens: number;
    outputPer1kTokens: number;
    sourceUrl: string;
    manualEntry: true;
  }
> = {
  "claude-3-haiku": {
    displayName: "Claude 3 Haiku",
    inputPer1kTokens: 0.00025,
    outputPer1kTokens: 0.00125,
    sourceUrl: "https://aws.amazon.com/bedrock/pricing/",
    manualEntry: true,
  },
  "claude-3.5-sonnet": {
    displayName: "Claude 3.5 Sonnet",
    inputPer1kTokens: 0.003,
    outputPer1kTokens: 0.015,
    sourceUrl: "https://aws.amazon.com/bedrock/pricing/",
    manualEntry: true,
  },
  "llama3-8b": {
    displayName: "Llama 3 8B",
    inputPer1kTokens: 0.0003,
    outputPer1kTokens: 0.0006,
    sourceUrl: "https://aws.amazon.com/bedrock/pricing/",
    manualEntry: true,
  },
  "mistral-large": {
    displayName: "Mistral Large",
    inputPer1kTokens: 0.004,
    outputPer1kTokens: 0.012,
    sourceUrl: "https://aws.amazon.com/bedrock/pricing/",
    manualEntry: true,
  },
};

interface EC2Product {
  attributes: {
    instanceType?: string;
    operatingSystem?: string;
    tenancy?: string;
    preInstalledSw?: string;
    capacitystatus?: string;
  };
}

interface EC2Term {
  priceDimensions: Record<
    string,
    { pricePerUnit: { USD: string }; unit: string }
  >;
}

async function fetchEc2Pricing(): Promise<Record<string, unknown>> {
  console.log("Fetching EC2 pricing (this may take a moment)...");
  const res = await fetch(EC2_PRICING_URL);
  if (!res.ok) throw new Error(`EC2 pricing fetch failed: ${res.status}`);
  const data = await res.json();

  const targetInstances = ["g5.xlarge", "g5.2xlarge", "g5.4xlarge"];
  const result: Record<string, unknown> = {};

  const products: Record<string, EC2Product> = data.products;
  const onDemandTerms: Record<string, Record<string, EC2Term>> =
    data.terms.OnDemand;
  const reservedTerms: Record<string, Record<string, EC2Term>> =
    data.terms.Reserved;

  for (const [sku, product] of Object.entries(products)) {
    const attrs = product.attributes;
    if (
      !attrs.instanceType ||
      !targetInstances.includes(attrs.instanceType) ||
      attrs.operatingSystem !== "Linux" ||
      attrs.tenancy !== "Shared" ||
      attrs.preInstalledSw !== "NA" ||
      attrs.capacitystatus !== "Used"
    )
      continue;

    const instanceType = attrs.instanceType;
    if (result[instanceType]) continue;

    // On-Demand price
    let onDemandPerHour = 0;
    const odTerms = onDemandTerms[sku];
    if (odTerms) {
      const firstTerm = Object.values(odTerms)[0];
      const firstDim = Object.values(firstTerm.priceDimensions)[0];
      onDemandPerHour = parseFloat(firstDim.pricePerUnit.USD);
    }

    // Reserved prices
    let reserved1yrNoUpfront = 0;
    let reserved1yrAllUpfront = 0;
    const resTerms = reservedTerms[sku];
    if (resTerms) {
      for (const term of Object.values(resTerms)) {
        const dims = Object.values(term.priceDimensions);
        const hourlyDim = dims.find((d) => d.unit === "Hrs");
        // Identify by the pricing structure
        const hasUpfront = dims.some(
          (d) => d.unit === "Quantity" && parseFloat(d.pricePerUnit.USD) > 0
        );
        const hourlyRate = hourlyDim
          ? parseFloat(hourlyDim.pricePerUnit.USD)
          : 0;

        if (!hasUpfront && hourlyRate > 0 && hourlyRate < onDemandPerHour) {
          reserved1yrNoUpfront = hourlyRate;
        }
        if (hasUpfront && hourlyRate === 0) {
          // All Upfront: calculate effective hourly from the upfront amount
          const upfrontDim = dims.find(
            (d) =>
              d.unit === "Quantity" && parseFloat(d.pricePerUnit.USD) > 0
          );
          if (upfrontDim) {
            reserved1yrAllUpfront =
              parseFloat(upfrontDim.pricePerUnit.USD) / (365 * 24);
          }
        }
      }
    }

    result[instanceType] = {
      region: "us-east-1",
      onDemandPerHour,
      reserved1yrNoUpfrontPerHour: reserved1yrNoUpfront,
      reserved1yrAllUpfrontPerHour: reserved1yrAllUpfront,
      sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
    };
  }

  return result;
}

async function fetchTranscribePricing(): Promise<{
  standard: { perMinute: number; sourceUrl: string };
}> {
  console.log("Fetching Transcribe pricing...");

  // Transcribe pricing page is simpler — try Price List API
  try {
    const res = await fetch(TRANSCRIBE_PRICING_URL);
    if (res.ok) {
      const data = await res.json();
      // Look for standard transcription pricing in us-east-1
      const products: Record<string, { attributes: Record<string, string> }> =
        data.products;
      const terms: Record<string, Record<string, EC2Term>> =
        data.terms.OnDemand;

      for (const [sku, product] of Object.entries(products)) {
        const attrs = product.attributes;
        if (
          attrs.location === "US East (N. Virginia)" &&
          attrs.group === "aws-transcribe" &&
          attrs.usagetype?.includes("TranscribeMinutes")
        ) {
          const skuTerms = terms[sku];
          if (skuTerms) {
            const firstTerm = Object.values(skuTerms)[0];
            const firstDim = Object.values(firstTerm.priceDimensions)[0];
            const perMinute = parseFloat(firstDim.pricePerUnit.USD);
            if (perMinute > 0) {
              return {
                standard: {
                  perMinute,
                  sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
                },
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Transcribe Price List API failed, using known price:", e);
  }

  // Fallback to known price
  return {
    standard: {
      perMinute: 0.024,
      sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
    },
  };
}

async function main() {
  try {
    const [ec2, transcribe] = await Promise.all([
      fetchEc2Pricing(),
      fetchTranscribePricing(),
    ]);

    const snapshot = {
      lastUpdated: new Date().toISOString(),
      ec2,
      transcribe,
      bedrock: BEDROCK_MANUAL,
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`Pricing snapshot written to ${OUTPUT_PATH}`);
    console.log(`  EC2 instances: ${Object.keys(ec2).join(", ") || "(none found — using fallback)"}`);
    console.log(`  Transcribe: $${transcribe.standard.perMinute}/min`);
    console.log(`  Bedrock models: ${Object.keys(BEDROCK_MANUAL).join(", ")}`);
  } catch (error) {
    console.error("Failed to fetch pricing:", error);
    console.log("Generating fallback snapshot with known prices...");

    const fallback = {
      lastUpdated: new Date().toISOString(),
      ec2: {
        "g5.xlarge": {
          region: "us-east-1",
          onDemandPerHour: 1.006,
          reserved1yrNoUpfrontPerHour: 0.636,
          reserved1yrAllUpfrontPerHour: 0.575,
          sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
        },
      },
      transcribe: {
        standard: {
          perMinute: 0.024,
          sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
        },
      },
      bedrock: BEDROCK_MANUAL,
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(fallback, null, 2) + "\n");
    console.log(`Fallback snapshot written to ${OUTPUT_PATH}`);
  }
}

main();
```

**Step 2: Install tsx as dev dependency and run the script**

Run: `cd web && npm install -D tsx`
Run: `cd .. && npx tsx scripts/fetch-aws-pricing.ts`
Expected: `aws-pricing-snapshot.json` created with EC2/Transcribe/Bedrock data

**Step 3: Verify the output JSON is valid and matches types**

Read `web/src/data/aws-pricing-snapshot.json` and verify it has `lastUpdated`, `ec2.g5.xlarge.onDemandPerHour`, `transcribe.standard.perMinute`, `bedrock` keys.

**Step 4: Add prebuild script to package.json**

In `web/package.json`, add to `"scripts"`:
```json
"prebuild": "tsx ../scripts/fetch-aws-pricing.ts"
```

**Step 5: Commit**

```bash
git add scripts/fetch-aws-pricing.ts web/src/data/aws-pricing-snapshot.json web/package.json
git commit -m "feat: add build-time AWS pricing fetch script with fallback"
```

---

### Task 3: Runtime Pricing API Route

**Files:**
- Create: `web/src/app/api/pricing/route.ts`
- Reference: `web/src/types/aws-pricing.ts`

**Step 1: Create the API route**

```typescript
// web/src/app/api/pricing/route.ts
import { NextResponse } from "next/server";
import type { AwsPricingSnapshot } from "@/types/aws-pricing";
import fallbackSnapshot from "@/data/aws-pricing-snapshot.json";

let cache: { data: AwsPricingSnapshot; timestamp: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const EC2_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json";

async function fetchLivePricing(): Promise<AwsPricingSnapshot | null> {
  try {
    // Only fetch EC2 at runtime (it's the most likely to change)
    // Transcribe and Bedrock change rarely
    const res = await fetch(EC2_PRICING_URL, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const products = data.products;
    const onDemandTerms = data.terms.OnDemand;

    const ec2: AwsPricingSnapshot["ec2"] = {};
    const targetInstances = ["g5.xlarge", "g5.2xlarge", "g5.4xlarge"];

    for (const [sku, product] of Object.entries(products) as [string, any][]) {
      const attrs = product.attributes;
      if (
        !attrs.instanceType ||
        !targetInstances.includes(attrs.instanceType) ||
        attrs.operatingSystem !== "Linux" ||
        attrs.tenancy !== "Shared" ||
        attrs.preInstalledSw !== "NA" ||
        attrs.capacitystatus !== "Used"
      )
        continue;

      if (ec2[attrs.instanceType]) continue;

      let onDemandPerHour = 0;
      const odTerms = onDemandTerms[sku];
      if (odTerms) {
        const firstTerm = Object.values(odTerms)[0] as any;
        const firstDim = Object.values(firstTerm.priceDimensions)[0] as any;
        onDemandPerHour = parseFloat(firstDim.pricePerUnit.USD);
      }

      ec2[attrs.instanceType] = {
        region: "us-east-1",
        onDemandPerHour,
        reserved1yrNoUpfrontPerHour:
          (fallbackSnapshot as AwsPricingSnapshot).ec2[attrs.instanceType]
            ?.reserved1yrNoUpfrontPerHour ?? 0,
        reserved1yrAllUpfrontPerHour:
          (fallbackSnapshot as AwsPricingSnapshot).ec2[attrs.instanceType]
            ?.reserved1yrAllUpfrontPerHour ?? 0,
        sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
      };
    }

    // Merge with fallback for Transcribe/Bedrock (rarely changes)
    const base = fallbackSnapshot as AwsPricingSnapshot;
    return {
      lastUpdated: new Date().toISOString(),
      ec2: Object.keys(ec2).length > 0 ? ec2 : base.ec2,
      transcribe: base.transcribe,
      bedrock: base.bedrock,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "X-Pricing-Source": "cache" },
    });
  }

  const live = await fetchLivePricing();
  if (live) {
    cache = { data: live, timestamp: Date.now() };
    return NextResponse.json(live, {
      headers: { "X-Pricing-Source": "live" },
    });
  }

  // Fallback to build-time snapshot
  return NextResponse.json(fallbackSnapshot, {
    headers: { "X-Pricing-Source": "fallback" },
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add web/src/app/api/pricing/route.ts
git commit -m "feat: add runtime pricing API route with 24h cache and fallback"
```

---

### Task 4: Client Pricing Hook

**Files:**
- Create: `web/src/hooks/useAwsPricing.ts`
- Reference: `web/src/types/aws-pricing.ts`, `web/src/data/aws-pricing-snapshot.json`

**Step 1: Create the hook**

```typescript
// web/src/hooks/useAwsPricing.ts
"use client";

import { useState, useEffect } from "react";
import type { AwsPricingSnapshot } from "@/types/aws-pricing";
import fallbackSnapshot from "@/data/aws-pricing-snapshot.json";

interface UseAwsPricingResult {
  pricing: AwsPricingSnapshot;
  lastUpdated: string;
  isLive: boolean;
}

export function useAwsPricing(): UseAwsPricingResult {
  const [pricing, setPricing] = useState<AwsPricingSnapshot>(
    fallbackSnapshot as AwsPricingSnapshot
  );
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLive() {
      try {
        const res = await fetch("/api/pricing");
        if (!res.ok) return;
        const data: AwsPricingSnapshot = await res.json();
        if (!cancelled) {
          setPricing(data);
          setIsLive(true);
        }
      } catch {
        // Keep fallback snapshot — no action needed
      }
    }

    fetchLive();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    pricing,
    lastUpdated: pricing.lastUpdated,
    isLive,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add web/src/hooks/useAwsPricing.ts
git commit -m "feat: add useAwsPricing hook with snapshot fallback"
```

---

### Task 5: Enhanced Capacity Calculator Engine

**Files:**
- Modify: `web/src/data/capacity.ts` (full rewrite)
- Reference: `web/src/types/aws-pricing.ts`

**Step 1: Rewrite capacity.ts with corrected formulas**

```typescript
// web/src/data/capacity.ts
import type { AwsPricingSnapshot } from "@/types/aws-pricing";

export interface CapacityInput {
  monthlyTasks: number;
  avgAudioMinutes: number;
  whisperRtf: number;
  bedrockModelKey: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  gpuTargetUtilization: number;
}

export interface CapacityResult {
  recommendedPhase: 1 | 2 | 3;
  phaseName: string;
  // Self-hosted path
  sttGpus: number;
  llmGpus: number;
  gpuCostPerMonth: number;
  selfHostedMonthlyCost: number;
  // Managed path
  transcribeMonthlyCost: number;
  bedrockCostPerTask: number;
  bedrockMonthlyCost: number;
  managedMonthlyCost: number;
  // Comparison
  savings: number;
  // Throughput
  sttTasksPerMinPerGpu: number;
  totalSttCapacity: number;
}

const HOURS_PER_MONTH = 730;
const BASE_INFRA_COST = 500; // ALB, RDS, ElastiCache, S3, CloudWatch
const BASE_MANAGED_INFRA = 100;
const LLM_TASKS_PER_GPU_PER_MIN = 40;

export const DEFAULT_INPUT: CapacityInput = {
  monthlyTasks: 10000,
  avgAudioMinutes: 3,
  whisperRtf: 0.1,
  bedrockModelKey: "claude-3-haiku",
  avgInputTokens: 1500,
  avgOutputTokens: 500,
  gpuTargetUtilization: 0.7,
};

export function calculateCapacity(
  input: CapacityInput,
  pricing: AwsPricingSnapshot
): CapacityResult {
  const {
    monthlyTasks,
    avgAudioMinutes,
    whisperRtf,
    bedrockModelKey,
    avgInputTokens,
    avgOutputTokens,
    gpuTargetUtilization,
  } = input;

  const tasksPerMin = monthlyTasks / (30 * 24 * 60);

  // --- STT throughput (corrected formula) ---
  const processingTimeSec = avgAudioMinutes * 60 * whisperRtf;
  const sttTasksPerMinPerGpu = 60 / processingTimeSec;
  const sttGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (sttTasksPerMinPerGpu * gpuTargetUtilization))
  );

  // --- LLM GPUs ---
  const llmGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (LLM_TASKS_PER_GPU_PER_MIN * gpuTargetUtilization))
  );

  // --- GPU cost (On-Demand) ---
  const ec2 = pricing.ec2["g5.xlarge"];
  const gpuCostPerMonth = ec2 ? ec2.onDemandPerHour * HOURS_PER_MONTH : 734;
  const selfHostedMonthlyCost =
    (sttGpus + llmGpus) * gpuCostPerMonth + BASE_INFRA_COST;

  // --- Managed cost ---
  const transcribeMonthlyCost =
    monthlyTasks * avgAudioMinutes * pricing.transcribe.standard.perMinute;

  const model = pricing.bedrock[bedrockModelKey];
  const bedrockCostPerTask = model
    ? (avgInputTokens / 1000) * model.inputPer1kTokens +
      (avgOutputTokens / 1000) * model.outputPer1kTokens
    : 0.001;
  const bedrockMonthlyCost = monthlyTasks * bedrockCostPerTask;
  const managedMonthlyCost =
    transcribeMonthlyCost + bedrockMonthlyCost + BASE_MANAGED_INFRA;

  // --- Savings ---
  const savings =
    managedMonthlyCost > 0
      ? Math.round(
          ((managedMonthlyCost - selfHostedMonthlyCost) / managedMonthlyCost) *
            100
        )
      : 0;

  // --- Phase recommendation ---
  let recommendedPhase: 1 | 2 | 3;
  let phaseName: string;
  if (monthlyTasks < 50000) {
    recommendedPhase = 1;
    phaseName = "MVP";
  } else if (monthlyTasks < 500000) {
    recommendedPhase = 2;
    phaseName = "Growth";
  } else {
    recommendedPhase = 3;
    phaseName = "Scale";
  }

  const totalSttCapacity = sttGpus * sttTasksPerMinPerGpu;

  return {
    recommendedPhase,
    phaseName,
    sttGpus,
    llmGpus,
    gpuCostPerMonth,
    selfHostedMonthlyCost,
    transcribeMonthlyCost,
    bedrockCostPerTask,
    bedrockMonthlyCost,
    managedMonthlyCost,
    savings,
    sttTasksPerMinPerGpu,
    totalSttCapacity,
  };
}

/**
 * Generate cost comparison data for the CostAnalysis chart.
 * Called with current pricing + input config, produces data points
 * across a range of monthly task volumes.
 */
export function generateCostCurveData(
  baseInput: CapacityInput,
  pricing: AwsPricingSnapshot
) {
  const taskVolumes = [1000, 5000, 10000, 30000, 50000, 100000, 200000, 500000, 1000000];
  return taskVolumes.map((tasks) => {
    const result = calculateCapacity({ ...baseInput, monthlyTasks: tasks }, pricing);
    return {
      tasks,
      managed: Math.round(result.managedMonthlyCost),
      selfHosted: Math.round(result.selfHostedMonthlyCost),
      managedPerTask: result.managedMonthlyCost / tasks,
      selfHostedPerTask: result.selfHostedMonthlyCost / tasks,
    };
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: Errors in `CapacityCalculator.tsx` and `CostAnalysis.tsx` (expected — they still use old API). No errors in `capacity.ts` itself.

**Step 3: Commit**

```bash
git add web/src/data/capacity.ts
git commit -m "feat: rewrite capacity calculator with corrected STT formula and per-token Bedrock pricing"
```

---

### Task 6: Capacity Context Provider

**Files:**
- Create: `web/src/contexts/CapacityContext.tsx`

**Purpose:** Share calculator inputs, pricing, and results across CapacityCalculator, CostAnalysis, and ArchitectureEvolution components.

**Step 1: Create the context**

```typescript
// web/src/contexts/CapacityContext.tsx
"use client";

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import { calculateCapacity, generateCostCurveData, DEFAULT_INPUT } from "@/data/capacity";
import { useAwsPricing } from "@/hooks/useAwsPricing";
import type { CapacityInput, CapacityResult } from "@/data/capacity";
import type { AwsPricingSnapshot } from "@/types/aws-pricing";

interface CapacityContextValue {
  input: CapacityInput;
  setInput: (updater: Partial<CapacityInput>) => void;
  result: CapacityResult;
  costCurveData: ReturnType<typeof generateCostCurveData>;
  pricing: AwsPricingSnapshot;
  isLive: boolean;
  lastUpdated: string;
}

const CapacityContext = createContext<CapacityContextValue | null>(null);

export function CapacityProvider({ children }: { children: ReactNode }) {
  const { pricing, isLive, lastUpdated } = useAwsPricing();
  const [input, setInputState] = useState<CapacityInput>(DEFAULT_INPUT);

  const setInput = useCallback((partial: Partial<CapacityInput>) => {
    setInputState((prev) => ({ ...prev, ...partial }));
  }, []);

  const result = useMemo(
    () => calculateCapacity(input, pricing),
    [input, pricing]
  );

  const costCurveData = useMemo(
    () => generateCostCurveData(input, pricing),
    [input, pricing]
  );

  const value = useMemo(
    () => ({ input, setInput, result, costCurveData, pricing, isLive, lastUpdated }),
    [input, setInput, result, costCurveData, pricing, isLive, lastUpdated]
  );

  return (
    <CapacityContext.Provider value={value}>
      {children}
    </CapacityContext.Provider>
  );
}

export function useCapacity(): CapacityContextValue {
  const ctx = useContext(CapacityContext);
  if (!ctx) throw new Error("useCapacity must be used within CapacityProvider");
  return ctx;
}
```

**Step 2: Wrap the page with the provider**

In `web/src/app/[locale]/page.tsx`, import and wrap:

```typescript
import { CapacityProvider } from "@/contexts/CapacityContext";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <CapacityProvider>
          <Hero />
          <ArchitectureEvolution />
          <TaskFlow />
          <CapacityCalculator />
          <CostAnalysis />
          <TechSelection />
          <ArchitectureTraits />
          <Observability />
          <DeploymentPipeline />
        </CapacityProvider>
      </main>
      <ChatWidget />
    </>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: May still have errors in consumer components (next tasks fix those)

**Step 4: Commit**

```bash
git add web/src/contexts/CapacityContext.tsx web/src/app/\[locale\]/page.tsx
git commit -m "feat: add CapacityProvider context to share pricing state across sections"
```

---

### Task 7: Update CapacityCalculator UI with New Controls

**Files:**
- Modify: `web/src/components/sections/CapacityCalculator.tsx`
- Modify: `web/src/messages/en.json` (add new i18n keys)
- Modify: `web/src/messages/zh.json` (add new i18n keys)

**Step 1: Add new i18n keys to en.json**

Add under `"capacity"`:
```json
"whisperRtf": "Whisper RTF (Real-Time Factor)",
"bedrockModel": "Bedrock Model",
"avgInputTokens": "Avg Input Tokens",
"avgOutputTokens": "Avg Output Tokens",
"sttThroughput": "STT Throughput",
"tasksPerMinPerGpu": "tasks/min/GPU",
"totalCapacity": "Total STT Capacity",
"tasksPerMin": "tasks/min",
"gpuCostPerMonth": "GPU Cost",
"perMonth": "/month",
"transcribeCost": "Transcribe Cost",
"bedrockCost": "Bedrock Cost",
"pricingLive": "Live pricing",
"pricingSnapshot": "Snapshot",
"updatedAt": "Updated",
"selfHostedTotal": "Self-Hosted Total",
"managedTotal": "Managed Total",
"assumptions": "Assumptions",
"assumptionsText": "GPU: g5.xlarge On-Demand (730h/mo) | Utilization target: 70% | Whisper large-v3 | ~400 tokens/min transcription | Base infra: ALB, RDS, ElastiCache, S3, CloudWatch"
```

**Step 2: Add new i18n keys to zh.json**

Add corresponding Chinese translations under `"capacity"`:
```json
"whisperRtf": "Whisper RTF (即時因子)",
"bedrockModel": "Bedrock 模型",
"avgInputTokens": "平均輸入 Tokens",
"avgOutputTokens": "平均輸出 Tokens",
"sttThroughput": "STT 吞吐量",
"tasksPerMinPerGpu": "tasks/min/GPU",
"totalCapacity": "STT 總容量",
"tasksPerMin": "tasks/min",
"gpuCostPerMonth": "GPU 成本",
"perMonth": "/月",
"transcribeCost": "Transcribe 成本",
"bedrockCost": "Bedrock 成本",
"pricingLive": "即時定價",
"pricingSnapshot": "快照",
"updatedAt": "更新於",
"selfHostedTotal": "自建總成本",
"managedTotal": "託管總成本",
"assumptions": "假設條件",
"assumptionsText": "GPU: g5.xlarge On-Demand (730h/月) | 利用率目標: 70% | Whisper large-v3 | ~400 tokens/分鐘轉錄 | 基礎建設: ALB, RDS, ElastiCache, S3, CloudWatch"
```

**Step 3: Rewrite CapacityCalculator.tsx**

Replace the entire component to use `useCapacity()` context, add new sliders (RTF), model dropdown, token inputs, pricing badge, and expanded results with source tooltips.

Key changes:
- Remove local `calculateCapacity` call → use `useCapacity()`
- Add RTF slider (0.05-0.25, step 0.01, default 0.10)
- Add Bedrock model dropdown (options from `pricing.bedrock` keys)
- Add collapsible "Advanced" section with token inputs
- Add pricing badge (green live / yellow snapshot)
- Results panel: show STT throughput, GPU cost with source tooltip, dual-path comparison
- Add collapsible "Assumptions" section at bottom

The full component code should follow existing patterns: `SectionWrapper`, `GradientText`, `motion`, Tailwind classes matching the current dark theme (`bg-bg-card`, `border-border`, `text-text-primary`, etc.).

```typescript
// web/src/components/sections/CapacityCalculator.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCapacity } from "@/contexts/CapacityContext";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const LOG_MIN = Math.log10(1000);
const LOG_MAX = Math.log10(2000000);

function sliderToValue(sliderPos: number): number {
  const logVal = LOG_MIN + (sliderPos / 100) * (LOG_MAX - LOG_MIN);
  const raw = Math.pow(10, logVal);
  if (raw < 10000) return Math.round(raw / 500) * 500;
  if (raw < 100000) return Math.round(raw / 5000) * 5000;
  return Math.round(raw / 50000) * 50000;
}

function valueToSlider(value: number): number {
  const logVal = Math.log10(Math.max(1000, value));
  return ((logVal - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

const PHASE_COLORS: Record<number, string> = {
  1: "bg-success",
  2: "bg-warning",
  3: "bg-accent-end",
};

export default function CapacityCalculator() {
  const t = useTranslations("capacity");
  const { input, setInput, result, pricing, isLive, lastUpdated } = useCapacity();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const volumeSlider = valueToSlider(input.monthlyTasks);

  const formatNumber = (n: number) =>
    n >= 1000 ? n.toLocaleString("en-US") : n.toString();
  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const bedrockModels = Object.entries(pricing.bedrock).map(([key, model]) => ({
    key,
    displayName: model.displayName,
  }));

  return (
    <SectionWrapper id="capacity">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <GradientText>{t("title")}</GradientText>
          </h2>
          <p className="text-text-secondary max-w-2xl">{t("subtitle")}</p>
        </div>
        {/* Pricing Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isLive
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-success" : "bg-warning"}`}
          />
          {isLive ? t("pricingLive") : t("pricingSnapshot")} &middot;{" "}
          {t("updatedAt")}{" "}
          {new Date(lastUpdated).toLocaleDateString()}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
          {/* Monthly Volume */}
          <SliderControl
            label={t("monthlyVolume")}
            displayValue={formatNumber(input.monthlyTasks)}
            min={0}
            max={100}
            step={0.5}
            value={volumeSlider}
            onChange={(v) => setInput({ monthlyTasks: sliderToValue(v) })}
            ticks={["1K", "10K", "100K", "1M", "2M"]}
          />

          {/* Audio Length */}
          <SliderControl
            label={t("audioLength")}
            displayValue={`${input.avgAudioMinutes.toFixed(1)} min`}
            min={0.5}
            max={15}
            step={0.5}
            value={input.avgAudioMinutes}
            onChange={(v) => setInput({ avgAudioMinutes: v })}
            ticks={["0.5", "5", "10", "15"]}
          />

          {/* Whisper RTF */}
          <SliderControl
            label={t("whisperRtf")}
            displayValue={input.whisperRtf.toFixed(2)}
            min={0.05}
            max={0.25}
            step={0.01}
            value={input.whisperRtf}
            onChange={(v) => setInput({ whisperRtf: v })}
            ticks={["0.05", "0.10", "0.15", "0.20", "0.25"]}
          />

          {/* Bedrock Model */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              {t("bedrockModel")}
            </label>
            <select
              value={input.bedrockModelKey}
              onChange={(e) => setInput({ bedrockModelKey: e.target.value })}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            >
              {bedrockModels.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {showAdvanced ? "- Hide" : "+ Show"} Advanced
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-border">
              <NumberInput
                label={t("avgInputTokens")}
                value={input.avgInputTokens}
                onChange={(v) => setInput({ avgInputTokens: v })}
                min={100}
                max={10000}
              />
              <NumberInput
                label={t("avgOutputTokens")}
                value={input.avgOutputTokens}
                onChange={(v) => setInput({ avgOutputTokens: v })}
                min={50}
                max={5000}
              />
            </div>
          )}
        </div>

        {/* Results Panel */}
        <motion.div className="bg-bg-card border border-border rounded-2xl p-6" layout>
          <div className="grid grid-cols-2 gap-4">
            {/* Phase */}
            <div className="col-span-2 flex items-center gap-3 pb-4 border-b border-border">
              <span className="text-sm text-text-secondary">{t("recommended")}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold text-white ${PHASE_COLORS[result.recommendedPhase]}`}
              >
                Phase {result.recommendedPhase}: {result.phaseName}
              </span>
            </div>

            {/* STT Throughput */}
            <ResultCard
              label={t("sttThroughput")}
              value={`${result.sttTasksPerMinPerGpu.toFixed(1)} ${t("tasksPerMinPerGpu")}`}
              accent="text-cyan"
            />
            <ResultCard
              label={t("totalCapacity")}
              value={`${result.totalSttCapacity.toFixed(0)} ${t("tasksPerMin")}`}
              accent="text-cyan"
              sublabel={`${result.sttGpus} STT + ${result.llmGpus} LLM GPUs`}
            />

            {/* Self-hosted */}
            <ResultCard
              label={t("selfHostedTotal")}
              value={formatCurrency(result.selfHostedMonthlyCost)}
              accent="text-cyan"
              sublabel={`GPU: ${formatCurrency(result.gpuCostPerMonth)}${t("perMonth")} each`}
            />

            {/* Managed */}
            <ResultCard
              label={t("managedTotal")}
              value={formatCurrency(result.managedMonthlyCost)}
              accent="text-warning"
              sublabel={`Bedrock: $${result.bedrockCostPerTask.toFixed(4)}/task`}
            />

            {/* Savings */}
            <div className="col-span-2 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-text-secondary">{t("savings")}</span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  result.savings > 0 ? "text-success" : "text-warning"
                }`}
              >
                {result.savings}%
              </span>
            </div>
          </div>

          {/* Assumptions */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              {showAssumptions ? "- " : "+ "}
              {t("assumptions")}
            </button>
            {showAssumptions && (
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                {t("assumptionsText")}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}

/* --- Sub-components --- */

function SliderControl({
  label,
  displayValue,
  min,
  max,
  step,
  value,
  onChange,
  ticks,
}: {
  label: string;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  ticks: string[];
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <span className="text-lg font-bold text-accent-start tabular-nums">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-accent-start"
      />
      <div className="flex justify-between text-xs text-text-secondary mt-1">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-text-secondary">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-28 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary text-right tabular-nums"
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  accent,
  sublabel,
}: {
  label: string;
  value: string;
  accent: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-bg-primary/50 rounded-xl p-4">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${accent} tabular-nums`}
        style={{ transition: "all 0.3s ease" }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-text-secondary/60 mt-1">{sublabel}</p>
      )}
    </div>
  );
}
```

**Step 4: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: CapacityCalculator compiles. CostAnalysis may still have issues (next task).

**Step 5: Commit**

```bash
git add web/src/components/sections/CapacityCalculator.tsx web/src/messages/en.json web/src/messages/zh.json
git commit -m "feat: rewrite CapacityCalculator UI with RTF slider, model picker, and pricing badge"
```

---

### Task 8: Update CostAnalysis to Use Dynamic Data

**Files:**
- Modify: `web/src/components/sections/CostAnalysis.tsx`
- Delete: `web/src/data/costs.ts` (replaced by `generateCostCurveData`)

**Step 1: Update CostAnalysis to use context**

Replace the static `costData` import with `useCapacity()`. The chart now reflects the user's current configuration.

```typescript
// web/src/components/sections/CostAnalysis.tsx
"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTranslations } from "next-intl";
import { useCapacity } from "@/contexts/CapacityContext";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

type ViewMode = "monthly" | "perTask";

function formatTasks(value: number): string {
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs text-text-secondary mb-2">
        {formatTasks(label ?? 0)} tasks/month
      </p>
      {payload.map((entry: any) => (
        <p
          key={entry.name}
          className="text-sm font-medium"
          style={{ color: entry.color }}
        >
          {entry.name}: ${Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function PerTaskTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs text-text-secondary mb-2">
        {formatTasks(label ?? 0)} tasks/month
      </p>
      {payload.map((entry: any) => (
        <p
          key={entry.name}
          className="text-sm font-medium"
          style={{ color: entry.color }}
        >
          {entry.name}: ${Number(entry.value).toFixed(4)}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function CostAnalysis() {
  const t = useTranslations("cost");
  const { costCurveData } = useCapacity();
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  const managedKey = viewMode === "monthly" ? "managed" : "managedPerTask";
  const selfHostedKey = viewMode === "monthly" ? "selfHosted" : "selfHostedPerTask";

  // Find crossover point (where selfHosted becomes cheaper)
  const crossoverTasks = useMemo(() => {
    for (const point of costCurveData) {
      if (point.selfHosted <= point.managed) return point.tasks;
    }
    return null;
  }, [costCurveData]);

  return (
    <SectionWrapper id="cost">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <GradientText>{t("title")}</GradientText>
          </h2>
          <p className="text-text-secondary max-w-2xl">{t("subtitle")}</p>
        </div>
        <div className="flex bg-bg-card border border-border rounded-xl p-1 w-fit shrink-0">
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              viewMode === "monthly"
                ? "bg-gradient-to-r from-accent-start to-accent-end text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t("monthlyCost")}
          </button>
          <button
            onClick={() => setViewMode("perTask")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              viewMode === "perTask"
                ? "bg-gradient-to-r from-accent-start to-accent-end text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t("perTaskCost")}
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-4 md:p-6">
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-text-secondary">{t("managed")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan" />
            <span className="text-sm text-text-secondary">{t("selfHosted")}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={costCurveData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid stroke="#1E1E2E" strokeDasharray="3 3" />
            <XAxis
              dataKey="tasks"
              tickFormatter={formatTasks}
              stroke="#94A3B8"
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              label={{
                value: t("tasksPerMonth"),
                position: "insideBottom",
                offset: -10,
                fill: "#94A3B8",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              tickFormatter={(v: number) =>
                viewMode === "monthly" ? `$${v.toLocaleString()}` : `$${v.toFixed(3)}`
              }
            />
            <Tooltip
              content={viewMode === "monthly" ? <MonthlyTooltip /> : <PerTaskTooltip />}
            />
            {viewMode === "monthly" && crossoverTasks && (
              <ReferenceLine
                x={crossoverTasks}
                stroke="#6366F1"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `${t("crossoverPoint")} ~${formatTasks(crossoverTasks)}`,
                  position: "top",
                  fill: "#94A3B8",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              name={t("managed")}
              type="monotone"
              dataKey={managedKey}
              stroke="#F59E0B"
              strokeWidth={2.5}
              dot={{ fill: "#F59E0B", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              name={t("selfHosted")}
              type="monotone"
              dataKey={selfHostedKey}
              stroke="#22D3EE"
              strokeWidth={2.5}
              dot={{ fill: "#22D3EE", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionWrapper>
  );
}
```

**Step 2: Delete `web/src/data/costs.ts`**

This file is no longer needed — cost curve data is now generated dynamically.

**Step 3: Verify no other file imports from costs.ts**

Run: `cd web && grep -r "from.*costs" src/ --include="*.ts" --include="*.tsx"` (use Grep tool)
Expected: Only `CostAnalysis.tsx` was importing it, and it's now updated.

**Step 4: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors related to CostAnalysis

**Step 5: Commit**

```bash
git add web/src/components/sections/CostAnalysis.tsx
git rm web/src/data/costs.ts
git commit -m "feat: wire CostAnalysis to dynamic pricing context, remove static costs.ts"
```

---

### Task 9: Dynamic Architecture Metrics

**Files:**
- Modify: `web/src/data/architecture-nodes.ts` — export `PhaseMetrics` generation function
- Modify: `web/src/components/sections/ArchitectureEvolution.tsx` — use context for dynamic metrics

**Step 1: Add dynamic metrics generator to architecture-nodes.ts**

Add at the bottom of the file (keep all existing code, just add):

```typescript
import type { CapacityResult, CapacityInput } from "@/data/capacity";

/**
 * Generate dynamic metrics for a phase based on calculator results.
 * Phase 1 uses managed service costs; Phase 2/3 use self-hosted.
 */
export function getDynamicMetrics(
  phaseKey: string,
  result: CapacityResult,
  input: CapacityInput
): PhaseMetrics {
  const base = phases[phaseKey]?.metrics;
  if (!base) return phases.phase1.metrics;

  if (phaseKey === "phase1") {
    // Phase 1 is managed-only
    return {
      ...base,
      monthlyCost: `$${Math.round(result.managedMonthlyCost).toLocaleString()}`,
      throughput: `~${result.totalSttCapacity.toFixed(0)} tasks/min`,
    };
  }

  // Phase 2 & 3: self-hosted
  return {
    ...base,
    monthlyCost: `$${Math.round(result.selfHostedMonthlyCost).toLocaleString()}`,
    throughput: `~${result.totalSttCapacity.toFixed(0)} tasks/min`,
    aiModels:
      phaseKey === "phase2"
        ? `Whisper (RTF ${input.whisperRtf}) + vLLM (${result.sttGpus}+${result.llmGpus} GPUs)`
        : `Multi-GPU Pool (${result.sttGpus}+${result.llmGpus} GPUs)`,
  };
}
```

**Step 2: Update ArchitectureEvolution to use dynamic metrics**

In `ArchitectureEvolution.tsx`, import `useCapacity` and `getDynamicMetrics`:

```typescript
import { useCapacity } from "@/contexts/CapacityContext";
import { getDynamicMetrics } from "@/data/architecture-nodes";
```

Replace the line:
```typescript
const data = phases[activePhase];
```

With:
```typescript
const data = phases[activePhase];
const { result, input } = useCapacity();
const dynamicMetrics = useMemo(
  () => getDynamicMetrics(activePhase, result, input),
  [activePhase, result, input]
);
```

And change the MetricsPanel prop:
```typescript
<MetricsPanel metrics={dynamicMetrics} phaseKey={activePhase} />
```

Add `useMemo` to the import if not already there.

**Step 3: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add web/src/data/architecture-nodes.ts web/src/components/sections/ArchitectureEvolution.tsx
git commit -m "feat: wire architecture diagram metrics to dynamic capacity calculator"
```

---

### Task 10: Update task-flow-steps.ts STT Timing Description

**Files:**
- Modify: `web/src/data/task-flow-steps.ts:69` — correct the timing description

**Step 1: Update the STT step detail**

Change line 69 from:
```
"GPU inference ~5-10s per 1-min audio. Redis SETNX for idempotency.",
```
To:
```
"GPU inference time = audio_duration x RTF (e.g., 3-min audio at RTF 0.10 = 18s). Redis SETNX for idempotency.",
```

And the Chinese version (line 74) from:
```
"GPU 推理 ~5-10 秒/分鐘音檔，Redis SETNX 冪等鎖",
```
To:
```
"GPU 推理時間 = 音檔長度 x RTF（如 3 分鐘音檔 RTF 0.10 = 18 秒），Redis SETNX 冪等鎖",
```

**Step 2: Commit**

```bash
git add web/src/data/task-flow-steps.ts
git commit -m "fix: correct STT timing description to use RTF formula"
```

---

### Task 11: Visual Smoke Test

**Files:** None (manual verification)

**Step 1: Start dev server**

Run: `cd web && npm run dev`

**Step 2: Verify in browser**

Open `http://localhost:3000` and check:

1. **Capacity Calculator section:**
   - All sliders work (monthly tasks, audio length, RTF)
   - Bedrock model dropdown populates from pricing data
   - Results update in real-time
   - Pricing badge shows (live or snapshot)
   - Advanced section toggles token inputs
   - Assumptions section expands

2. **Cost Analysis section:**
   - Chart reflects current calculator settings
   - Crossover point moves when you change settings
   - Per-task view works

3. **Architecture Evolution section:**
   - Phase 2/3 metrics update when calculator inputs change
   - Monthly cost and throughput reflect real calculations

4. **Task Flow section:**
   - STT step shows RTF-based formula

**Step 3: Verify i18n**

Switch to Chinese locale and verify all new labels render correctly.

**Step 4: Run lint**

Run: `cd web && npm run lint`
Expected: No errors

**Step 5: Run build**

Run: `cd web && npm run build`
Expected: Build succeeds (prebuild fetches pricing, build compiles)

**Step 6: Commit any fixes found during smoke test**

---

### Task Dependencies

```
Task 1 (types) ─────────────────────┐
                                     ├─→ Task 4 (hook) ─┐
Task 2 (fetch script) → snapshot.json┘                   ├─→ Task 6 (context) ─┬─→ Task 7 (calculator UI)
                                                         │                      ├─→ Task 8 (cost analysis)
Task 3 (API route) ─────────────────────────────────────┘                      ├─→ Task 9 (arch metrics)
                                                                                └─→ Task 10 (task-flow fix)
Task 5 (capacity.ts) ─────────────────────────────────────────────────────────┘
                                                                                Task 11 (smoke test) — last
```

Tasks 1, 2, 3, 5 can be parallelized. Task 4 depends on 1+2. Task 6 depends on 4+5. Tasks 7-10 depend on 6. Task 11 is last.
