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
