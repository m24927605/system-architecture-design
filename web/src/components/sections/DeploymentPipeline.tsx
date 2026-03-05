"use client";

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

/* ------------------------------------------------------------------ */
/*  Environment Topology                                              */
/* ------------------------------------------------------------------ */

interface EnvConfig {
  key: string;
  icon: string;
  specs: { label: string; labelZh: string; value: string }[];
  cost: string;
  borderColor: string;
  glowColor: string;
}

const environments: EnvConfig[] = [
  {
    key: "dev",
    icon: "D",
    specs: [
      { label: "Infra", labelZh: "基礎設施", value: "docker-compose" },
      { label: "GPU", labelZh: "GPU", value: "0" },
      { label: "Services", labelZh: "服務", value: "Mock" },
    ],
    cost: "~$30/mo",
    borderColor: "border-success",
    glowColor: "shadow-success/10",
  },
  {
    key: "staging",
    icon: "S",
    specs: [
      { label: "Infra", labelZh: "基礎設施", value: "EKS 3 nodes" },
      { label: "GPU", labelZh: "GPU", value: "1" },
      { label: "Services", labelZh: "服務", value: "Real models" },
    ],
    cost: "~$800/mo",
    borderColor: "border-warning",
    glowColor: "shadow-warning/10",
  },
  {
    key: "prod",
    icon: "P",
    specs: [
      { label: "Infra", labelZh: "基礎設施", value: "EKS 6+ nodes" },
      { label: "GPU", labelZh: "GPU", value: "4+" },
      { label: "Services", labelZh: "服務", value: "Full stack" },
    ],
    cost: "Phase-dependent",
    borderColor: "border-accent-end",
    glowColor: "shadow-accent-end/10",
  },
];

function EnvironmentTopology() {
  const t = useTranslations("deploy");
  const locale = useLocale();
  const isZh = locale === "zh";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 items-center">
      {environments.map((env, idx) => (
        <div key={env.key} className="flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.15 }}
            className={`flex-1 bg-bg-card border ${env.borderColor} rounded-2xl p-5 shadow-lg ${env.glowColor}`}
          >
            {/* Icon header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-accent-start to-accent-end`}
              >
                {env.icon}
              </div>
              <h4 className="text-lg font-bold text-text-primary">
                {t(env.key)}
              </h4>
            </div>

            {/* Specs */}
            <div className="space-y-2 mb-4">
              {env.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex justify-between text-sm"
                >
                  <span className="text-text-secondary">
                    {isZh ? spec.labelZh : spec.label}
                  </span>
                  <span className="text-text-primary font-medium">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Cost */}
            <div className="pt-3 border-t border-border">
              <span className="text-xs text-text-secondary">Cost: </span>
              <span className="text-sm font-bold text-cyan">{env.cost}</span>
            </div>
          </motion.div>

          {/* Arrow between cards (hidden on last, hidden on mobile) */}
          {idx < environments.length - 1 && (
            <div className="hidden md:flex items-center px-2 text-text-secondary">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CI/CD Pipeline                                                    */
/* ------------------------------------------------------------------ */

interface PipelineStep {
  label: string;
  type: "ci" | "cd";
}

const pipelineSteps: PipelineStep[] = [
  { label: "Push", type: "ci" },
  { label: "Lint", type: "ci" },
  { label: "Test", type: "ci" },
  { label: "Build", type: "ci" },
  { label: "Scan", type: "ci" },
  { label: "PR", type: "ci" },
  { label: "ECR", type: "cd" },
  { label: "Staging", type: "cd" },
  { label: "Approval", type: "cd" },
  { label: "Canary", type: "cd" },
];

function CICDPipeline() {
  const t = useTranslations("deploy");

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">
        {t("cicd")}
      </h3>
      <div className="bg-bg-card border border-border rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {pipelineSteps.map((step, idx) => (
            <div key={step.label} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  step.type === "ci"
                    ? "bg-cyan/15 text-cyan border border-cyan/30"
                    : "bg-accent-end/15 text-accent-end border border-accent-end/30"
                }`}
              >
                {step.label}
              </motion.div>
              {idx < pipelineSteps.length - 1 && (
                <svg
                  className="w-4 h-4 text-text-secondary/40 shrink-0 mx-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan" />
            <span className="text-xs text-text-secondary">CI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-end" />
            <span className="text-xs text-text-secondary">CD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Canary Deployment                                                 */
/* ------------------------------------------------------------------ */

interface CanaryPhase {
  label: string;
  labelZh: string;
  canaryPct: number;
  wait: string;
  waitZh: string;
  criteria: string[];
  criteriaZh: string[];
}

const canaryPhases: CanaryPhase[] = [
  {
    label: "Phase 1 — Smoke Test",
    labelZh: "Phase 1 — 煙霧測試",
    canaryPct: 10,
    wait: "Observe 10 min",
    waitZh: "觀察 10 分鐘",
    criteria: ["Error rate < 1%", "P99 latency < 3s", "No DLQ messages"],
    criteriaZh: ["錯誤率 < 1%", "P99 延遲 < 3s", "DLQ 訊息為 0"],
  },
  {
    label: "Phase 2 — Expanded Traffic",
    labelZh: "Phase 2 — 擴大流量",
    canaryPct: 30,
    wait: "Observe 15 min",
    waitZh: "觀察 15 分鐘",
    criteria: ["Error rate < 0.5%", "P99 latency < 2s", "GPU utilization stable"],
    criteriaZh: ["錯誤率 < 0.5%", "P99 延遲 < 2s", "GPU 使用率穩定"],
  },
  {
    label: "Phase 3 — Full Rollout",
    labelZh: "Phase 3 — 全量上線",
    canaryPct: 100,
    wait: "Complete",
    waitZh: "完成",
    criteria: ["All metrics green", "Old ReplicaSet scaled to 0"],
    criteriaZh: ["所有指標正常", "舊版 ReplicaSet 縮減至 0"],
  },
];

const ROLLBACK_TRIGGERS = [
  { label: "Error rate > 5% for 2 min", labelZh: "錯誤率 > 5% 持續 2 分鐘" },
  { label: "P99 latency > 5s for 3 min", labelZh: "P99 延遲 > 5s 持續 3 分鐘" },
  { label: "DLQ messages > 0 for 1 min", labelZh: "DLQ 訊息 > 0 持續 1 分鐘" },
  { label: "Pod CrashLoopBackOff detected", labelZh: "偵測到 Pod CrashLoopBackOff" },
];

function CanaryDeployment() {
  const t = useTranslations("deploy");
  const locale = useLocale();
  const isZh = locale === "zh";

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">
        {t("canary")}
      </h3>
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-6">
        {canaryPhases.map((phase, idx) => {
          const stablePct = 100 - phase.canaryPct;
          const isLast = phase.canaryPct === 100;
          return (
            <motion.div
              key={phase.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">
                  {isZh ? phase.labelZh : phase.label}
                </span>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {!isLast && (
                    <>
                      <span>
                        <span className="text-cyan font-semibold">
                          {phase.canaryPct}%
                        </span>{" "}
                        canary
                      </span>
                      <span>
                        <span className="text-text-secondary/60 font-semibold">
                          {stablePct}%
                        </span>{" "}
                        stable
                      </span>
                    </>
                  )}
                  {isLast && (
                    <span className="text-cyan font-semibold">
                      100% canary
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-bg-primary rounded-full overflow-hidden flex">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan to-accent-start rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${phase.canaryPct}%` }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    delay: idx * 0.15 + 0.3,
                    ease: "easeOut",
                  }}
                />
                {stablePct > 0 && (
                  <div
                    className="h-full bg-border"
                    style={{ width: `${stablePct}%` }}
                  />
                )}
              </div>

              {/* Criteria + wait time */}
              <div className="mt-2 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                <div className="flex items-center gap-1.5 shrink-0">
                  <svg className="w-3.5 h-3.5 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  <span className="text-xs text-text-secondary font-medium">
                    {isZh ? phase.waitZh : phase.wait}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isZh ? phase.criteriaZh : phase.criteria).map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-success/10 text-success border border-success/20"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow to next phase */}
              {idx < canaryPhases.length - 1 && (
                <div className="flex justify-center mt-3 text-text-secondary/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Auto-rollback section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-text-primary">
              {isZh ? "自動回滾條件" : "Auto-Rollback Triggers"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLLBACK_TRIGGERS.map((trigger) => (
              <span
                key={trigger.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-500/10 text-red-400 border border-red-500/20"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {isZh ? trigger.labelZh : trigger.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function DeploymentPipeline() {
  const t = useTranslations("deploy");

  return (
    <SectionWrapper id="deploy">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-10 max-w-2xl">{t("subtitle")}</p>

      <div className="space-y-12">
        {/* 1. Environment Topology */}
        <EnvironmentTopology />

        {/* 2. CI/CD Pipeline */}
        <CICDPipeline />

        {/* 3. Canary Deployment */}
        <CanaryDeployment />
      </div>
    </SectionWrapper>
  );
}
