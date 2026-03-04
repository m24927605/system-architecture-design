"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  techCategories,
  TechCategory,
  Phase,
  PHASE_LABELS,
} from "@/data/tech-selection";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const phases: Phase[] = [1, 2, 3];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.2 },
  },
};

function CategoryCard({
  cat,
  phase,
  isZh,
}: {
  cat: TechCategory;
  phase: Phase;
  isZh: boolean;
}) {
  const t = useTranslations("tech");
  const [showAlts, setShowAlts] = useState(false);

  const choice = cat.phases.find((p) => p.phase === phase)!;
  const category = isZh ? cat.categoryZh : cat.category;
  const rationale = isZh ? choice.rationaleZh : choice.rationale;

  return (
    <motion.div
      variants={cardVariants}
      layout
      className={`bg-bg-card border border-border rounded-2xl p-5 md:p-6 border-l-4 ${cat.color} hover:border-accent-start/40 transition-colors`}
    >
      {/* Category badge */}
      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-text-secondary bg-bg-primary/60 px-3 py-1 rounded-full mb-3">
        {category}
      </span>

      {/* Chosen tech */}
      <h3 className="text-lg md:text-xl font-bold text-text-primary mb-2">
        {choice.chosen}
      </h3>

      {/* Rationale */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {rationale}
      </p>

      {/* Alternatives toggle */}
      {cat.alternatives.length > 0 && (
        <>
          <button
            onClick={() => setShowAlts(!showAlts)}
            className="flex items-center gap-2 text-sm font-medium text-accent-start hover:text-accent-end transition-colors cursor-pointer"
          >
            <span>{t("alternatives")}</span>
            <motion.svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={{ rotate: showAlts ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </button>

          <motion.div
            initial={false}
            animate={{
              height: showAlts ? "auto" : 0,
              opacity: showAlts ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              {cat.alternatives.map((alt) => (
                <div key={alt.name} className="flex items-start gap-2">
                  <span className="text-warning text-sm mt-0.5 shrink-0">
                    ✕
                  </span>
                  <div>
                    <span className="text-sm font-medium text-text-primary">
                      {alt.name}
                    </span>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {isZh ? alt.reasonZh : alt.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export default function TechSelection() {
  const t = useTranslations("tech");
  const locale = useLocale();
  const isZh = locale === "zh";
  const [activePhase, setActivePhase] = useState<Phase>(1);

  return (
    <SectionWrapper id="tech">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-8 max-w-2xl">{t("subtitle")}</p>

      {/* Phase tabs */}
      <div className="flex gap-2 mb-8">
        {phases.map((phase) => {
          const label = isZh
            ? PHASE_LABELS[phase].zh
            : PHASE_LABELS[phase].en;
          const isActive = activePhase === phase;
          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/25"
                  : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent-start/40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {techCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              phase={activePhase}
              isZh={isZh}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </SectionWrapper>
  );
}
