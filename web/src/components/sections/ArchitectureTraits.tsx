"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { traits, type PhaseKey } from "@/data/traits";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const PHASE_KEYS: PhaseKey[] = ["phase1", "phase2", "phase3"];

const TAB_LABEL_KEYS: Record<PhaseKey, string> = {
  phase1: "phase1",
  phase2: "phase2",
  phase3: "phase3",
};

export default function ArchitectureTraits() {
  const t = useTranslations("traits");
  const locale = useLocale();
  const isZh = locale === "zh";
  const [activePhase, setActivePhase] = useState<PhaseKey>("phase1");
  const [selectedKey, setSelectedKey] = useState<string>(traits[0].key);

  const selectedTrait = traits.find((tr) => tr.key === selectedKey) ?? traits[0];
  const phaseTrait = selectedTrait.phases[activePhase];

  const chartData = useMemo(
    () =>
      traits.map((tr) => ({
        dimension: t(tr.key),
        score: tr.phases[activePhase].score,
        fullMark: 10,
      })),
    [activePhase, t]
  );

  return (
    <SectionWrapper id="traits">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-8 max-w-2xl">{t("subtitle")}</p>

      {/* Phase Tabs */}
      <div className="flex gap-1 mb-6 relative bg-bg-card/50 rounded-xl p-1 w-fit border border-border">
        {PHASE_KEYS.map((key) => {
          const isActive = key === activePhase;
          return (
            <button
              key={key}
              onClick={() => setActivePhase(key)}
              className={`relative z-10 px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="traits-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-start to-accent-end"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {t(TAB_LABEL_KEYS[key])}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Radar Chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 md:p-6">
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="#1E1E2E" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickCount={6}
                stroke="#1E1E2E"
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Dimension selector + detail panel */}
        <div className="space-y-4">
          {/* Dimension pills */}
          <div className="flex flex-wrap gap-2">
            {traits.map((tr) => {
              const score = tr.phases[activePhase].score;
              return (
                <button
                  key={tr.key}
                  onClick={() => setSelectedKey(tr.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    selectedKey === tr.key
                      ? "bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/20"
                      : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent-start/40"
                  }`}
                >
                  {t(tr.key)}
                  <span className="ml-2 text-xs opacity-70">{score}/10</span>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <TraitDetail
            key={`${activePhase}-${selectedKey}`}
            score={phaseTrait.score}
            summary={isZh ? phaseTrait.summaryZh : phaseTrait.summary}
            details={isZh ? phaseTrait.detailsZh : phaseTrait.details}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}

function TraitDetail({
  score,
  summary,
  details,
}: {
  score: number;
  summary: string;
  details: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-bg-card border border-border rounded-2xl p-5 md:p-6"
    >
      {/* Score bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-start to-accent-end rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${score * 10}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <span className="text-sm font-bold text-accent-start tabular-nums">
          {score}/10
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-primary font-medium mb-4">{summary}</p>

      {/* Detail bullets */}
      <ul className="space-y-2">
        {details.map((detail, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <span className="text-cyan mt-1 shrink-0">
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 8 8"
              >
                <circle cx="4" cy="4" r="3" />
              </svg>
            </span>
            <span>{detail}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
