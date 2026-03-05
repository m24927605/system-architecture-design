// web/src/components/sections/CapacityCalculator.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCapacity } from "@/contexts/CapacityContext";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const LOG_MIN = Math.log10(1000);
const LOG_MAX = Math.log10(2000000);

function sliderToValue(sliderPos: number): number {
  const logVal = LOG_MIN + (sliderPos / 100) * (LOG_MAX - LOG_MIN);
  const raw = Math.pow(10, logVal);
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
  const { input, setInput, result, pricing, isLive, lastUpdated } = useCapacity();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const volumeSlider = valueToSlider(input.monthlyTasks);

  const formatNumber = (n: number) =>
    n >= 1000 ? n.toLocaleString("en-US") : n.toString();
  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const bedrockModels = Object.entries(pricing.bedrock).map(([key, model]) => ({
    key,
    displayName: model.displayName,
  }));

  return (
    <SectionWrapper id="capacity">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <GradientText>{t("title")}</GradientText>
          </h2>
          <p className="text-text-secondary max-w-2xl">{t("subtitle")}</p>
        </div>
        {/* Pricing Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isLive
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-success" : "bg-warning"}`}
          />
          {isLive ? t("pricingLive") : t("pricingSnapshot")} &middot;{" "}
          {t("updatedAt")}{" "}
          {new Date(lastUpdated).toLocaleDateString()}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
          {/* Monthly Volume */}
          <SliderControl
            label={t("monthlyVolume")}
            displayValue={formatNumber(input.monthlyTasks)}
            min={0}
            max={100}
            step={0.5}
            value={volumeSlider}
            onChange={(v) => setInput({ monthlyTasks: sliderToValue(v) })}
            ticks={["1K", "10K", "100K", "1M", "2M"]}
          />

          {/* Audio Length */}
          <SliderControl
            label={t("audioLength")}
            displayValue={`${input.avgAudioMinutes.toFixed(1)} min`}
            min={0.5}
            max={15}
            step={0.5}
            value={input.avgAudioMinutes}
            onChange={(v) => setInput({ avgAudioMinutes: v })}
            ticks={["0.5", "5", "10", "15"]}
          />

          {/* Whisper RTF */}
          <SliderControl
            label={t("whisperRtf")}
            displayValue={input.whisperRtf.toFixed(2)}
            min={0.05}
            max={0.25}
            step={0.01}
            value={input.whisperRtf}
            onChange={(v) => setInput({ whisperRtf: v })}
            ticks={["0.05", "0.10", "0.15", "0.20", "0.25"]}
          />

          {/* Bedrock Model */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              {t("bedrockModel")}
            </label>
            <select
              value={input.bedrockModelKey}
              onChange={(e) => setInput({ bedrockModelKey: e.target.value })}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            >
              {bedrockModels.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {showAdvanced ? "- Hide" : "+ Show"} Advanced
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-border">
              <NumberInput
                label={t("avgInputTokens")}
                value={input.avgInputTokens}
                onChange={(v) => setInput({ avgInputTokens: v })}
                min={100}
                max={10000}
              />
              <NumberInput
                label={t("avgOutputTokens")}
                value={input.avgOutputTokens}
                onChange={(v) => setInput({ avgOutputTokens: v })}
                min={50}
                max={5000}
              />
            </div>
          )}
        </div>

        {/* Results Panel */}
        <motion.div className="bg-bg-card border border-border rounded-2xl p-6" layout>
          <div className="grid grid-cols-2 gap-4">
            {/* Phase */}
            <div className="col-span-2 flex items-center gap-3 pb-4 border-b border-border">
              <span className="text-sm text-text-secondary">{t("recommended")}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold text-white ${PHASE_COLORS[result.recommendedPhase]}`}
              >
                Phase {result.recommendedPhase}: {result.phaseName}
              </span>
            </div>

            {/* STT Throughput */}
            <ResultCard
              label={t("sttThroughput")}
              value={`${result.sttTasksPerMinPerGpu.toFixed(1)} ${t("tasksPerMinPerGpu")}`}
              accent="text-cyan"
            />
            <ResultCard
              label={t("totalCapacity")}
              value={`${result.totalSttCapacity.toFixed(0)} ${t("tasksPerMin")}`}
              accent="text-cyan"
              sublabel={`${result.sttGpus} STT + ${result.llmGpus} LLM GPUs`}
            />

            {/* Self-hosted */}
            <ResultCard
              label={t("selfHostedTotal")}
              value={formatCurrency(result.selfHostedMonthlyCost)}
              accent="text-cyan"
              sublabel={`GPU: ${formatCurrency(result.gpuCostPerMonth)}${t("perMonth")} each`}
            />

            {/* Managed */}
            <ResultCard
              label={t("managedTotal")}
              value={formatCurrency(result.managedMonthlyCost)}
              accent="text-warning"
              sublabel={`Bedrock: $${result.bedrockCostPerTask.toFixed(4)}/task`}
            />

            {/* Savings */}
            <div className="col-span-2 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-text-secondary">{t("savings")}</span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  result.savings > 0 ? "text-success" : "text-warning"
                }`}
              >
                {result.savings}%
              </span>
            </div>
          </div>

          {/* Assumptions */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              {showAssumptions ? "- " : "+ "}
              {t("assumptions")}
            </button>
            {showAssumptions && (
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                {t("assumptionsText")}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}

/* --- Sub-components --- */

function SliderControl({
  label,
  displayValue,
  min,
  max,
  step,
  value,
  onChange,
  ticks,
}: {
  label: string;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  ticks: string[];
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <span className="text-lg font-bold text-accent-start tabular-nums">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-accent-start"
      />
      <div className="flex justify-between text-xs text-text-secondary mt-1">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-text-secondary">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-28 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary text-right tabular-nums"
      />
    </div>
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
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${accent} tabular-nums`}
        style={{ transition: "all 0.3s ease" }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-text-secondary/60 mt-1">{sublabel}</p>
      )}
    </div>
  );
}
