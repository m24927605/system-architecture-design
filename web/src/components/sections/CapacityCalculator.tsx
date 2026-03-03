"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { calculateCapacity } from "@/data/capacity";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

/* Logarithmic scale helpers for the volume slider */
const LOG_MIN = Math.log10(1000);
const LOG_MAX = Math.log10(1000000);

function sliderToValue(sliderPos: number): number {
  // sliderPos: 0-100 -> value: 1000-1000000 (log scale)
  const logVal = LOG_MIN + (sliderPos / 100) * (LOG_MAX - LOG_MIN);
  const raw = Math.pow(10, logVal);
  // Round to nice numbers
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
  const [volumeSlider, setVolumeSlider] = useState(
    valueToSlider(50000)
  );
  const [audioLength, setAudioLength] = useState(3);

  const monthlyTasks = useMemo(() => sliderToValue(volumeSlider), [volumeSlider]);

  const result = useMemo(
    () => calculateCapacity(monthlyTasks, audioLength),
    [monthlyTasks, audioLength]
  );

  const formatNumber = (n: number) =>
    n >= 1000 ? n.toLocaleString("en-US") : n.toString();

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <SectionWrapper id="capacity">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-10 max-w-2xl">{t("subtitle")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders Panel */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-8">
          {/* Monthly Volume Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-text-primary">
                {t("monthlyVolume")}
              </label>
              <span className="text-lg font-bold text-accent-start tabular-nums">
                {formatNumber(monthlyTasks)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={volumeSlider}
              onChange={(e) => setVolumeSlider(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-accent-start"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>1K</span>
              <span>10K</span>
              <span>100K</span>
              <span>1M</span>
            </div>
          </div>

          {/* Audio Length Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-text-primary">
                {t("audioLength")}
              </label>
              <span className="text-lg font-bold text-accent-start tabular-nums">
                {audioLength.toFixed(1)} min
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={audioLength}
              onChange={(e) => setAudioLength(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-accent-start"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0.5</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <motion.div
          className="bg-bg-card border border-border rounded-2xl p-6"
          layout
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Recommended Phase */}
            <div className="col-span-2 flex items-center gap-3 pb-4 border-b border-border">
              <span className="text-sm text-text-secondary">
                {t("recommended")}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold text-white ${PHASE_COLORS[result.recommendedPhase]}`}
                style={{ transition: "background-color 0.3s" }}
              >
                Phase {result.recommendedPhase}: {result.phaseName}
              </span>
            </div>

            {/* STT GPUs */}
            <ResultCard
              label={t("sttGpus")}
              value={result.sttGpus.toString()}
              accent="text-cyan"
            />

            {/* LLM GPUs */}
            <ResultCard
              label={t("llmGpus")}
              value={result.llmGpus.toString()}
              accent="text-accent-end"
            />

            {/* Self-Hosted Cost */}
            <ResultCard
              label={t("estimatedCost")}
              value={formatCurrency(result.selfHostedCost)}
              accent="text-cyan"
              sublabel="Self-hosted"
            />

            {/* Managed Cost */}
            <ResultCard
              label={t("managedCost")}
              value={formatCurrency(result.managedCost)}
              accent="text-warning"
              sublabel="Managed"
            />

            {/* Savings */}
            <div className="col-span-2 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {t("savings")}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  result.savings > 0 ? "text-success" : "text-warning"
                }`}
                style={{ transition: "color 0.3s" }}
              >
                {result.savings > 0 ? `${result.savings}%` : `${result.savings}%`}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
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
      <p className="text-xs text-text-secondary mb-1">
        {label}
        {sublabel && (
          <span className="text-text-secondary/60 ml-1">({sublabel})</span>
        )}
      </p>
      <p
        className={`text-xl font-bold ${accent} tabular-nums`}
        style={{ transition: "all 0.3s ease" }}
      >
        {value}
      </p>
    </div>
  );
}
