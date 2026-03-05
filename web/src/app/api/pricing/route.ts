import { NextResponse } from "next/server";
import type { AwsPricingSnapshot } from "@/types/aws-pricing";
import fallbackSnapshot from "@/data/aws-pricing-snapshot.json";

let cache: { data: AwsPricingSnapshot; timestamp: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const EC2_PRICING_URL =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json";

async function fetchLivePricing(): Promise<AwsPricingSnapshot | null> {
  try {
    const res = await fetch(EC2_PRICING_URL, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const products = data.products;
    const onDemandTerms = data.terms.OnDemand;

    const ec2: AwsPricingSnapshot["ec2"] = {};
    const targetInstances = ["g5.xlarge", "g5.2xlarge", "g5.4xlarge"];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    for (const [sku, product] of Object.entries(products) as [string, any][]) {
      const attrs = product.attributes;
      if (
        !attrs.instanceType ||
        !targetInstances.includes(attrs.instanceType) ||
        attrs.operatingSystem !== "Linux" ||
        attrs.tenancy !== "Shared" ||
        attrs.preInstalledSw !== "NA" ||
        attrs.capacitystatus !== "Used"
      ) continue;

      if (ec2[attrs.instanceType]) continue;

      let onDemandPerHour = 0;
      const odTerms = onDemandTerms[sku];
      if (odTerms) {
        const firstTerm = Object.values(odTerms)[0] as any;
        const firstDim = Object.values(firstTerm.priceDimensions)[0] as any;
        onDemandPerHour = parseFloat(firstDim.pricePerUnit.USD);
      }
    /* eslint-enable @typescript-eslint/no-explicit-any */

      const base = fallbackSnapshot as AwsPricingSnapshot;
      ec2[attrs.instanceType] = {
        region: "us-east-1",
        onDemandPerHour,
        reserved1yrNoUpfrontPerHour:
          base.ec2[attrs.instanceType]?.reserved1yrNoUpfrontPerHour ?? 0,
        reserved1yrAllUpfrontPerHour:
          base.ec2[attrs.instanceType]?.reserved1yrAllUpfrontPerHour ?? 0,
        sourceUrl: "https://aws.amazon.com/ec2/pricing/on-demand/",
      };
    }

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

  return NextResponse.json(fallbackSnapshot, {
    headers: { "X-Pricing-Source": "fallback" },
  });
}
