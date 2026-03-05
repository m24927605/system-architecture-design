"use client";

import { useMemo, useState } from "react";
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

  const crossoverTasks = useMemo(() => {
    for (const point of costCurveData) {
      if (point.selfHosted <= point.managed) return point.tasks;
    }
    return null;
  }, [costCurveData]);

  const managedKey = viewMode === "monthly" ? "managed" : "managedPerTask";
  const selfHostedKey =
    viewMode === "monthly" ? "selfHosted" : "selfHostedPerTask";

  return (
    <SectionWrapper id="cost">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <GradientText>{t("title")}</GradientText>
          </h2>
          <p className="text-text-secondary max-w-2xl">{t("subtitle")}</p>
        </div>

        {/* Toggle */}
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
        {/* Legend */}
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-text-secondary">{t("managed")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan" />
            <span className="text-sm text-text-secondary">
              {t("selfHosted")}
            </span>
          </div>
        </div>

        {/* Chart */}
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
                viewMode === "perTask" ? `$${v.toFixed(3)}` : `$${v}`
              }
            />
            <Tooltip
              content={viewMode === "monthly" ? <MonthlyTooltip /> : <PerTaskTooltip />}
            />

            {/* Dynamic crossover reference line */}
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
