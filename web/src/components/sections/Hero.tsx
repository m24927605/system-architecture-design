"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ParticleGrid from "../ui/ParticleGrid";
import GradientText from "../ui/GradientText";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticleGrid />
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <GradientText>{t("title")}</GradientText>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto"
        >
          {t("subtitle")}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white font-medium hover:shadow-lg hover:shadow-accent-start/25 transition-shadow cursor-pointer"
        >
          {t("cta")} ↓
        </motion.button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-primary to-transparent" />
    </section>
  );
}
