"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  obsPhases,
  alertTiers,
  metricCategories,
  dashboardServices,
  dashboardInfra,
  dashboardPipeline,
} from "@/data/observability";
import type { ObsMetrics, MetricType } from "@/data/observability";
import type { ArchNode } from "@/data/architecture-nodes";
import ArchitectureNode from "@/components/architecture/ArchitectureNode";
import ArchitectureEdge from "@/components/architecture/ArchitectureEdge";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

/* ------------------------------------------------------------------ */
/*  Main Section                                                       */
/* ------------------------------------------------------------------ */

export default function Observability() {
  const t = useTranslations("observability");
  const locale = useLocale();
  const isZh = locale === "zh";

  return (
    <SectionWrapper id="observability">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-10 max-w-2xl">{t("subtitle")}</p>

      <ObsStackDiagram t={t} />

      <div className="mt-16">
        <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-6">
          {t("alertTiers")}
        </h3>
        <AlertTiersAccordion t={t} isZh={isZh} />
      </div>

      <div className="mt-16">
        <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-6">
          {t("dashboardPreview")}
        </h3>
        <DashboardPreview isZh={isZh} />
      </div>

      <div className="mt-16">
        <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-6">
          {t("metricsCoverage")}
        </h3>
        <MetricsCoverage t={t} isZh={isZh} />
      </div>
    </SectionWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-block 1: ObsStackDiagram                                       */
/* ------------------------------------------------------------------ */

const OBS_PHASE_KEYS = ["phase1", "phase2", "phase3"] as const;
type ObsPhaseKey = (typeof OBS_PHASE_KEYS)[number];

const OBS_TAB_LABEL_KEYS: Record<ObsPhaseKey, string> = {
  phase1: "phase1",
  phase2: "phase2",
  phase3: "phase3",
};

const BASE_W = 900;
const BASE_H = 520;

function ObsStackDiagram({
  t,
}: {
  t: ReturnType<typeof useTranslations<"observability">>;
}) {
  const [activePhase, setActivePhase] = useState<ObsPhaseKey>("phase1");
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  /* Responsive scale -- fit canvas into available width */
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setScale(Math.min(1, w / BASE_W));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const data = obsPhases[activePhase];

  /* Build a node lookup map */
  const nodeMap = useMemo(() => {
    const m = new Map<string, ArchNode>();
    data.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [data.nodes]);

  const handleTab = useCallback((key: ObsPhaseKey) => {
    setActivePhase(key);
  }, []);

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 relative bg-bg-card/50 rounded-xl p-1 w-fit border border-border">
        {OBS_PHASE_KEYS.map((key) => {
          const isActive = key === activePhase;
          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={`relative z-10 px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="obs-phase-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-start to-accent-end"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {t(OBS_TAB_LABEL_KEYS[key])}
            </button>
          );
        })}
      </div>

      {/* Content area: diagram + metrics */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Diagram */}
        <div
          ref={containerRef}
          className="flex-1 rounded-2xl border border-border bg-bg-card/40 overflow-hidden"
          style={{ minHeight: BASE_H * scale + 20 }}
        >
          <div
            className="relative"
            style={{
              width: BASE_W * scale,
              height: BASE_H * scale,
              margin: "10px auto",
            }}
          >
            {/* SVG layer for edges */}
            <svg
              className="absolute inset-0"
              style={{ width: BASE_W * scale, height: BASE_H * scale }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <AnimatePresence>
                {data.edges.map((edge) => {
                  const src = nodeMap.get(edge.source);
                  const tgt = nodeMap.get(edge.target);
                  if (!src || !tgt) return null;
                  return (
                    <ArchitectureEdge
                      key={`${activePhase}-${edge.id}`}
                      sourceNode={src}
                      targetNode={tgt}
                      scale={scale}
                    />
                  );
                })}
              </AnimatePresence>
            </svg>

            {/* Node layer */}
            <AnimatePresence mode="popLayout">
              {data.nodes.map((node) => (
                <ArchitectureNode
                  key={`${activePhase}-${node.id}`}
                  id={node.id}
                  label={node.label}
                  type={node.type}
                  x={node.position.x}
                  y={node.position.y}
                  scale={scale}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Metrics panel */}
        <ObsMetricsPanel metrics={data.metrics} phaseKey={activePhase} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ObsMetricsPanel (inline, similar to MetricsPanel)                  */
/* ------------------------------------------------------------------ */

const obsMetricKeys: {
  key: keyof ObsMetrics;
  labelKey: string;
  icon: string;
}[] = [
  { key: "components", labelKey: "components", icon: "\u2B21" }, // ⬡
  { key: "monthlyCost", labelKey: "monthlyCost", icon: "$" },
  { key: "pillars", labelKey: "pillars", icon: "\u25CE" }, // ◎
  { key: "alerting", labelKey: "alerting", icon: "\u26A0" }, // ⚠
  { key: "ha", labelKey: "ha", icon: "\u267B" }, // ♻
];

function ObsMetricsPanel({
  metrics,
  phaseKey,
}: {
  metrics: ObsMetrics;
  phaseKey: string;
}) {
  const t = useTranslations("observability");

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
          {obsMetricKeys.map(({ key, labelKey, icon }, i) => (
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

/* ------------------------------------------------------------------ */
/*  Sub-block 2: AlertTiersAccordion                                   */
/* ------------------------------------------------------------------ */

function AlertTiersAccordion({
  t,
  isZh,
}: {
  t: ReturnType<typeof useTranslations<"observability">>;
  isZh: boolean;
}) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {alertTiers.map((tier) => {
        const isExpanded = expandedTier === tier.tier;
        return (
          <div
            key={tier.tier}
            className="rounded-xl bg-bg-card border border-border overflow-hidden"
            style={{ borderLeft: `4px solid ${tier.color}` }}
          >
            {/* Header row */}
            <button
              onClick={() =>
                setExpandedTier(isExpanded ? null : tier.tier)
              }
              className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer"
            >
              {/* Tier badge */}
              <span
                className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: tier.color + "20",
                  color: tier.color,
                }}
              >
                {tier.tier}
              </span>

              {/* Severity */}
              <span className="text-text-primary text-sm font-medium">
                {t(tier.severityKey)}
              </span>

              {/* Channels */}
              <span className="hidden sm:inline text-text-secondary text-xs flex-1 truncate">
                {isZh ? tier.channelsZh : tier.channels}
              </span>

              {/* Rule count */}
              <span className="text-text-secondary text-xs">
                {tier.rules.length}{" "}
                {isZh ? "\u689D\u898F\u5247" : "rules"}
              </span>

              {/* Chevron */}
              <motion.svg
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4 text-text-secondary shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </motion.svg>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_1fr_80px] gap-2 text-xs text-text-secondary font-medium border-b border-border pb-2 mb-2">
                      <span>{t("alert")}</span>
                      <span>{t("condition")}</span>
                      <span>{t("duration")}</span>
                    </div>

                    {/* Rule rows */}
                    {tier.rules.map((rule, i) => (
                      <motion.div
                        key={rule.alert}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="grid grid-cols-[1fr_1fr_80px] gap-2 text-sm py-1.5 border-b border-border/40 last:border-0"
                      >
                        <span className="text-text-primary">
                          {isZh ? rule.alertZh : rule.alert}
                        </span>
                        <span className="text-text-secondary font-mono text-xs">
                          {rule.condition}
                        </span>
                        <span className="text-text-secondary text-xs">
                          {rule.duration}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-block 3: DashboardPreview                                      */
/* ------------------------------------------------------------------ */

function DashboardPreview({ isZh }: { isZh: boolean }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6">
      {/* Top row: service cards + GPU cluster */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardServices.map((svc) => {
          const points = svc.sparkline
            .map(
              (v, i) =>
                `${(i / (svc.sparkline.length - 1)) * 100},${40 - v * (40 / 60)}`
            )
            .join(" ");
          return (
            <div
              key={svc.name}
              className="rounded-xl border border-border bg-bg-primary/60 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                {/* Green pulse dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 text-xs font-bold">
                  {svc.status}
                </span>
              </div>
              <div className="text-text-primary text-sm font-medium mb-1">
                {isZh ? svc.nameZh : svc.name}
              </div>
              <svg viewBox="0 0 100 40" className="w-full h-8 mb-1">
                <polyline
                  points={points}
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-text-secondary text-xs">{svc.value}</div>
            </div>
          );
        })}

        {/* GPU cluster card */}
        <div className="rounded-xl border border-border bg-bg-primary/60 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 text-xs font-bold">
              2 GPUs OK
            </span>
          </div>
          <div className="text-text-primary text-sm font-medium mb-2">
            GPU Cluster
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Util</span>
              <span className="text-text-primary font-mono">62%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Mem</span>
              <span className="text-text-primary font-mono">45%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline row */}
      <div className="flex items-center gap-2 flex-wrap">
        {dashboardPipeline.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-text-secondary text-lg">&rarr;</span>
            )}
            <div className="rounded-lg border border-border bg-bg-primary/60 px-3 py-2 text-center">
              <div className="text-text-primary text-xs font-medium">
                {item.label}
              </div>
              <div className="text-cyan text-xs font-mono">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Infrastructure row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {dashboardInfra.map((infra) => (
          <div
            key={infra.name}
            className="rounded-xl border border-border bg-bg-primary/60 px-4 py-3"
          >
            <div className="text-text-primary text-sm font-medium mb-2">
              {isZh ? infra.nameZh : infra.name}
            </div>
            {infra.lines.map((line) => (
              <div
                key={line.label}
                className="flex justify-between text-xs mb-1"
              >
                <span className="text-text-secondary">{line.label}</span>
                <span className="text-text-primary font-mono">
                  {line.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Active Alerts */}
      <div className="text-center text-sm">
        <span className="text-emerald-400 font-medium">
          Active Alerts: None &#10003;
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-block 4: MetricsCoverage                                       */
/* ------------------------------------------------------------------ */

const METRIC_TYPE_STYLES: Record<
  MetricType,
  string
> = {
  Counter: "bg-emerald-500/20 text-emerald-400",
  Histogram: "bg-amber-500/20 text-amber-400",
  Gauge: "bg-indigo-500/20 text-indigo-400",
};

const CATEGORY_KEYS = metricCategories.map((c) => c.key);

function MetricsCoverage({
  t,
  isZh,
}: {
  t: ReturnType<typeof useTranslations<"observability">>;
  isZh: boolean;
}) {
  const [activeTab, setActiveTab] = useState("application");

  const activeCategory = metricCategories.find((c) => c.key === activeTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === key
                ? "bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/20"
                : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent-start/40"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {activeCategory?.groups.map((group) => (
            <div key={group.service}>
              {/* Service sub-header */}
              <h4 className="text-text-primary font-semibold text-sm border-b border-border pb-1 mb-2">
                {isZh ? group.serviceZh : group.service}
              </h4>

              {/* Metric rows */}
              <div className="space-y-2">
                {group.metrics.map((m) => (
                  <div
                    key={m.name}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1"
                  >
                    <span className="font-mono text-cyan text-xs shrink-0">
                      {m.name}
                    </span>
                    <span
                      className={`${METRIC_TYPE_STYLES[m.type]} px-2 py-0.5 rounded text-xs w-fit`}
                    >
                      {m.type}
                    </span>
                    <span className="text-text-secondary text-sm">
                      {isZh ? m.descZh : m.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
