/**
 * Build-time script: fetches AWS pricing data and writes a snapshot JSON.
 *
 * Run with:  npx tsx scripts/fetch-aws-pricing.ts
 *
 * The snapshot is consumed by the Next.js app at build time so that
 * cost calculations always use reasonably fresh numbers.  If the fetch
 * fails (network issues, API changes, etc.) the script falls back to
 * hardcoded known-good prices so the build never breaks.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ec2PriceEntry {
  region: string;
  onDemandPerHour: number;
  reserved1yrNoUpfrontPerHour: number;
  reserved1yrAllUpfrontPerHour: number;
  sourceUrl: string;
}

interface TranscribePriceEntry {
  perMinute: number;
  sourceUrl: string;
}

interface BedrockPriceEntry {
  displayName: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  sourceUrl: string;
  manualEntry: boolean;
}

interface PricingSnapshot {
  lastUpdated: string;
  ec2: Record<string, Ec2PriceEntry>;
  transcribe: Record<string, TranscribePriceEntry>;
  bedrock: Record<string, BedrockPriceEntry>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EC2_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json";

const TRANSCRIBE_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonTranscribe/current/index.json";

const TARGET_INSTANCE_TYPES = ["g5.xlarge", "g5.2xlarge", "g5.4xlarge"];

const OUTPUT_PATH = resolve(
  __dirname,
  "..",
  "web",
  "src",
  "data",
  "aws-pricing-snapshot.json",
);

// Bedrock prices are not available via a public API, so we hardcode them.
const BEDROCK_PRICES: Record<string, BedrockPriceEntry> = {
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

// ---------------------------------------------------------------------------
// Fallback snapshot (known-good prices as of 2026-03-05)
// ---------------------------------------------------------------------------

const FALLBACK_SNAPSHOT: PricingSnapshot = {
  lastUpdated: "2026-03-05T00:00:00Z",
  ec2: {
    "g5.xlarge": {
      region: "us-east-1",
      onDemandPerHour: 1.006,
      reserved1yrNoUpfrontPerHour: 0.636,
      reserved1yrAllUpfrontPerHour: 0.575,
      sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
    },
    "g5.2xlarge": {
      region: "us-east-1",
      onDemandPerHour: 1.515,
      reserved1yrNoUpfrontPerHour: 0.958,
      reserved1yrAllUpfrontPerHour: 0.867,
      sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
    },
    "g5.4xlarge": {
      region: "us-east-1",
      onDemandPerHour: 2.534,
      reserved1yrNoUpfrontPerHour: 1.602,
      reserved1yrAllUpfrontPerHour: 1.449,
      sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
    },
  },
  transcribe: {
    standard: {
      perMinute: 0.024,
      sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
    },
  },
  bedrock: BEDROCK_PRICES,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`  Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// EC2 pricing extraction
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractEc2Prices(data: any): Record<string, Ec2PriceEntry> {
  const result: Record<string, Ec2PriceEntry> = {};
  const products: Record<string, any> = data.products ?? {};
  const terms: any = data.terms ?? {};

  // Build a map: sku -> product attributes for our target instances
  const skuMap = new Map<
    string,
    { instanceType: string; tenancy: string; os: string }
  >();

  for (const [sku, product] of Object.entries<any>(products)) {
    const attrs = product.attributes ?? {};
    if (
      TARGET_INSTANCE_TYPES.includes(attrs.instanceType) &&
      attrs.tenancy === "Shared" &&
      attrs.operatingSystem === "Linux"
    ) {
      skuMap.set(sku, {
        instanceType: attrs.instanceType,
        tenancy: attrs.tenancy,
        os: attrs.operatingSystem,
      });
    }
  }

  // Walk On-Demand terms
  const onDemandTerms: Record<string, any> = terms.OnDemand ?? {};
  const reservedTerms: Record<string, any> = terms.Reserved ?? {};

  for (const [sku, meta] of skuMap.entries()) {
    const entry: Partial<Ec2PriceEntry> = {
      region: "us-east-1",
      sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
    };

    // On-Demand price
    const odSkuTerms = onDemandTerms[sku];
    if (odSkuTerms) {
      for (const offer of Object.values<any>(odSkuTerms)) {
        for (const dim of Object.values<any>(offer.priceDimensions ?? {})) {
          const usd = parseFloat(dim.pricePerUnit?.USD ?? "0");
          if (usd > 0) {
            entry.onDemandPerHour = usd;
          }
        }
      }
    }

    // Reserved prices
    const resSkuTerms = reservedTerms[sku];
    if (resSkuTerms) {
      for (const offer of Object.values<any>(resSkuTerms)) {
        const termAttrs = offer.termAttributes ?? {};
        const leaseLength = termAttrs.LeaseContractLength;
        const purchaseOption = termAttrs.PurchaseOption;
        if (leaseLength !== "1yr") continue;

        for (const dim of Object.values<any>(offer.priceDimensions ?? {})) {
          const usd = parseFloat(dim.pricePerUnit?.USD ?? "0");
          // We want the per-hour dimension (not upfront lump sum)
          if (dim.unit === "Hrs" && usd > 0) {
            if (purchaseOption === "No Upfront") {
              entry.reserved1yrNoUpfrontPerHour = usd;
            } else if (purchaseOption === "All Upfront") {
              entry.reserved1yrAllUpfrontPerHour = usd;
            }
          }
        }

        // For "All Upfront" the hourly rate is $0; derive from upfront qty
        if (purchaseOption === "All Upfront") {
          for (const dim of Object.values<any>(offer.priceDimensions ?? {})) {
            const usd = parseFloat(dim.pricePerUnit?.USD ?? "0");
            if (dim.unit === "Quantity" && usd > 0) {
              // 1-year = 8760 hours
              entry.reserved1yrAllUpfrontPerHour = +(usd / 8760).toFixed(4);
            }
          }
        }
      }
    }

    if (entry.onDemandPerHour != null) {
      result[meta.instanceType] = entry as Ec2PriceEntry;
    }
  }

  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Transcribe pricing extraction
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractTranscribePrices(
  data: any,
): Record<string, TranscribePriceEntry> {
  const result: Record<string, TranscribePriceEntry> = {};
  const terms: any = data.terms ?? {};
  const onDemandTerms: Record<string, any> = terms.OnDemand ?? {};

  for (const skuTerms of Object.values<any>(onDemandTerms)) {
    for (const offer of Object.values<any>(skuTerms)) {
      for (const dim of Object.values<any>(offer.priceDimensions ?? {})) {
        const desc: string = (dim.description ?? "").toLowerCase();
        const usd = parseFloat(dim.pricePerUnit?.USD ?? "0");
        // Standard transcription is charged per second; convert to per minute
        if (usd > 0 && desc.includes("transcrib")) {
          result.standard = {
            perMinute: +(usd * 60).toFixed(4),
            sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
          };
          break;
        }
      }
    }
    if (result.standard) break;
  }

  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching AWS pricing data...\n");

  let snapshot: PricingSnapshot;

  try {
    // Fetch EC2 and Transcribe pricing in parallel
    const [ec2Data, transcribeData] = await Promise.all([
      fetchJson<unknown>(EC2_PRICING_URL),
      fetchJson<unknown>(TRANSCRIBE_PRICING_URL),
    ]);

    const ec2Prices = extractEc2Prices(ec2Data);
    const transcribePrices = extractTranscribePrices(transcribeData);

    // Validate that we got data for all target instances
    const missingInstances = TARGET_INSTANCE_TYPES.filter(
      (t) => !(t in ec2Prices),
    );
    if (missingInstances.length > 0) {
      console.warn(
        `Warning: missing EC2 prices for: ${missingInstances.join(", ")}`,
      );
      // Fill gaps from fallback
      for (const t of missingInstances) {
        if (FALLBACK_SNAPSHOT.ec2[t]) {
          ec2Prices[t] = FALLBACK_SNAPSHOT.ec2[t];
        }
      }
    }

    if (Object.keys(transcribePrices).length === 0) {
      console.warn(
        "Warning: could not extract Transcribe prices; using fallback.",
      );
    }

    snapshot = {
      lastUpdated: new Date().toISOString(),
      ec2: ec2Prices,
      transcribe:
        Object.keys(transcribePrices).length > 0
          ? transcribePrices
          : FALLBACK_SNAPSHOT.transcribe,
      bedrock: BEDROCK_PRICES,
    };
  } catch (err) {
    console.error(
      "Failed to fetch pricing data, falling back to hardcoded snapshot.\n",
      err,
    );
    snapshot = {
      ...FALLBACK_SNAPSHOT,
      lastUpdated: new Date().toISOString(),
    };
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
  console.log(`\nWrote pricing snapshot to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
