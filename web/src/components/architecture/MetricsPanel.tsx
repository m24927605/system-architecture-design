"use client";

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
              className="rounded-xl border border-border bg-bg-card/60 px-4 py-3"
            >
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <span className="text-sm">{icon}</span>
                {t(labelKey)}
              </div>
              <div className="text-text-primary text-sm font-semibold">
                {metrics[key]}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
