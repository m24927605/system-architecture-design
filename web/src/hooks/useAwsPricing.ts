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
        // Keep fallback snapshot
      }
    }

    fetchLive();
    return () => { cancelled = true; };
  }, []);

  return { pricing, lastUpdated: pricing.lastUpdated, isLive };
}
