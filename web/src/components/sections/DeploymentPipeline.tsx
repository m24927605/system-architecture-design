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
  canaryPct: number;
}

const canaryPhases: CanaryPhase[] = [
  { label: "Phase 1", canaryPct: 10 },
  { label: "Phase 2", canaryPct: 30 },
  { label: "Phase 3", canaryPct: 100 },
];

function CanaryDeployment() {
  const t = useTranslations("deploy");

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">
        {t("canary")}
      </h3>
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-5">
        {canaryPhases.map((phase, idx) => {
          const stablePct = 100 - phase.canaryPct;
          return (
            <motion.div
              key={phase.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">
                  {phase.label}
                </span>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {phase.canaryPct < 100 && (
                    <span>
                      <span className="text-cyan font-semibold">
                        {phase.canaryPct}%
                      </span>{" "}
                      canary
                    </span>
                  )}
                  {stablePct > 0 && phase.canaryPct < 100 && (
                    <span>
                      <span className="text-text-secondary/60 font-semibold">
                        {stablePct}%
                      </span>{" "}
                      stable
                    </span>
                  )}
                  {phase.canaryPct === 100 && (
                    <span className="text-cyan font-semibold">
                      100% canary
                    </span>
                  )}
                </div>
              </div>
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
            </motion.div>
          );
        })}
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
