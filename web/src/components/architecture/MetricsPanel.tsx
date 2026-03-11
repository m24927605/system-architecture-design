"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { PhaseMetrics } from "@/data/architecture-nodes";

interface MetricsPanelProps {
  metrics: PhaseMetrics;
  phaseKey: string;
}

const metricKeys: { key: keyof PhaseMetrics; labelKey: string; icon: string }[] = [
  { key: "monthlyCost", labelKey: "monthlyCost", icon: "$" },
  { key: "throughput", labelKey: "throughput", icon: "\u26A1" },
  { key: "compute", labelKey: "compute", icon: "\u2601" },
  { key: "aiModels", labelKey: "aiModels", icon: "\u2699" },
  { key: "deployment", labelKey: "deployment", icon: "\u21BB" },
];

export default function MetricsPanel({ metrics, phaseKey }: MetricsPanelProps) {
  const t = useTranslations("architecture");
  const [hoveredMetric, setHoveredMetric] = useState<keyof PhaseMetrics | null>(null);

  const throughputExplanationKey =
    phaseKey === "phase1"
      ? "throughputHelpPhase1"
      : phaseKey === "phase2"
        ? "throughputHelpPhase2"
        : "throughputHelpPhase3";

  return (
    <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseKey}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-3"
        >
          {metricKeys.map(({ key, labelKey, icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative rounded-xl border border-border bg-bg-card/60 px-4 py-3"
              onMouseEnter={() => setHoveredMetric(key)}
              onMouseLeave={() => setHoveredMetric((current) => (current === key ? null : current))}
            >
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <span className="text-sm">{icon}</span>
                {t(labelKey)}
              </div>
              <div className="text-text-primary text-sm font-semibold">
                {metrics[key]}
              </div>
              <AnimatePresence>
                {key === "throughput" && hoveredMetric === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-border bg-[#12121A]/95 p-3 text-xs leading-relaxed text-text-secondary shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur"
                  >
                    {t(throughputExplanationKey)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
