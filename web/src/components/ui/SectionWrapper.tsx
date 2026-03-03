"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function SectionWrapper({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`py-24 px-4 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </motion.section>
  );
}
