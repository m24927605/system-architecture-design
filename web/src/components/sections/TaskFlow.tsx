"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { flowSteps } from "@/data/task-flow-steps";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function TaskFlow() {
  const t = useTranslations("taskFlow");
  const locale = useLocale();
  const isZh = locale === "zh";
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SectionWrapper id="task-flow">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-12 max-w-2xl">{t("subtitle")}</p>

      <motion.div
        className="relative"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Vertical timeline line */}
        <div className="absolute left-5 md:left-7 top-0 bottom-0 w-px bg-gradient-to-b from-accent-start via-cyan to-accent-end opacity-30" />

        <div className="space-y-4">
          {flowSteps.map((step) => {
            const actor = isZh ? step.actorZh : step.actor;
            const action = isZh ? step.actionZh : step.action;
            const target = isZh ? step.targetZh : step.target;
            const detail = isZh ? step.detailZh : step.detail;
            const isExpanded = expandedId === step.id;

            return (
              <motion.div
                key={step.id}
                variants={itemVariants}
                className="relative pl-14 md:pl-18"
              >
                {/* Step number badge */}
                <div
                  className={`absolute left-2 md:left-4 top-4 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-border bg-bg-card ${step.color}`}
                >
                  {step.id}
                </div>

                {/* Card */}
                <button
                  onClick={() => toggleExpand(step.id)}
                  className={`w-full text-left bg-bg-card border border-border rounded-2xl p-4 md:p-5 transition-all duration-200 hover:border-accent-start/40 cursor-pointer border-l-3 ${step.color.replace("text-", "border-l-")}`}
                >
                  {/* Actor -> Action -> Target */}
                  <div className="flex flex-wrap items-center gap-2 text-sm md:text-base">
                    <span className={`font-semibold ${step.color}`}>
                      {actor}
                    </span>
                    <svg
                      className="w-4 h-4 text-text-secondary shrink-0"
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
                    <span className="font-mono text-text-primary bg-bg-primary/50 px-2 py-0.5 rounded text-xs md:text-sm">
                      {action}
                    </span>
                    <svg
                      className="w-4 h-4 text-text-secondary shrink-0"
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
                    <span className="text-text-secondary">{target}</span>

                    {/* Expand chevron */}
                    <motion.svg
                      className="w-4 h-4 text-text-secondary ml-auto shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </motion.svg>
                  </div>

                  {/* Expandable detail */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isExpanded ? "auto" : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 text-sm text-text-secondary leading-relaxed border-t border-border pt-3">
                      {detail}
                    </p>
                  </motion.div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
