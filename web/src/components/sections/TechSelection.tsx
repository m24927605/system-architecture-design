"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { techChoices, TechChoice } from "@/data/tech-selection";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function TechCard({ choice, isZh }: { choice: TechChoice; isZh: boolean }) {
  const t = useTranslations("tech");
  const [expanded, setExpanded] = useState(false);

  const category = isZh ? choice.categoryZh : choice.category;
  const rationale = isZh ? choice.rationaleZh : choice.rationale;

  return (
    <motion.div
      variants={cardVariants}
      className={`bg-bg-card border border-border rounded-2xl p-5 md:p-6 border-l-4 ${choice.color} hover:border-accent-start/40 transition-colors`}
    >
      {/* Category badge */}
      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-text-secondary bg-bg-primary/60 px-3 py-1 rounded-full mb-3">
        {category}
      </span>

      {/* Chosen tech name */}
      <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
        {choice.chosen}
      </h3>

      {/* Rationale */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {rationale}
      </p>

      {/* Alternatives toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-accent-start hover:text-accent-end transition-colors cursor-pointer"
      >
        <span>{t("alternatives")}</span>
        <motion.svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </button>

      {/* Alternatives list */}
      <motion.div
        initial={false}
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {choice.alternatives.map((alt) => (
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
    </motion.div>
  );
}

export default function TechSelection() {
  const t = useTranslations("tech");
  const locale = useLocale();
  const isZh = locale === "zh";

  return (
    <SectionWrapper id="tech">
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-10 max-w-2xl">{t("subtitle")}</p>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {techChoices.map((choice) => (
          <TechCard key={choice.id} choice={choice} isZh={isZh} />
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
