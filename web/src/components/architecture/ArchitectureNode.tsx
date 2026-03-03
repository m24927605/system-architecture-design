"use client";

import { motion } from "framer-motion";
import type { NodeType } from "@/data/architecture-nodes";

const typeColors: Record<
  NodeType,
  { bg: string; border: string; glow: string; text: string }
> = {
  api: {
    bg: "rgba(99,102,241,0.12)",
    border: "#6366F1",
    glow: "rgba(99,102,241,0.35)",
    text: "#A5B4FC",
  },
  worker: {
    bg: "rgba(34,211,238,0.10)",
    border: "#22D3EE",
    glow: "rgba(34,211,238,0.30)",
    text: "#67E8F9",
  },
  queue: {
    bg: "rgba(245,158,11,0.10)",
    border: "#F59E0B",
    glow: "rgba(245,158,11,0.30)",
    text: "#FCD34D",
  },
  db: {
    bg: "rgba(16,185,129,0.10)",
    border: "#10B981",
    glow: "rgba(16,185,129,0.30)",
    text: "#6EE7B7",
  },
  cache: {
    bg: "rgba(52,211,153,0.10)",
    border: "#34D399",
    glow: "rgba(52,211,153,0.30)",
    text: "#6EE7B7",
  },
  gpu: {
    bg: "rgba(239,68,68,0.10)",
    border: "#EF4444",
    glow: "rgba(239,68,68,0.30)",
    text: "#FCA5A5",
  },
  cdn: {
    bg: "rgba(59,130,246,0.10)",
    border: "#3B82F6",
    glow: "rgba(59,130,246,0.30)",
    text: "#93C5FD",
  },
  lb: {
    bg: "rgba(59,130,246,0.10)",
    border: "#3B82F6",
    glow: "rgba(59,130,246,0.30)",
    text: "#93C5FD",
  },
  external: {
    bg: "rgba(148,163,184,0.08)",
    border: "#64748B",
    glow: "rgba(148,163,184,0.20)",
    text: "#94A3B8",
  },
  user: {
    bg: "rgba(148,163,184,0.08)",
    border: "#64748B",
    glow: "rgba(148,163,184,0.20)",
    text: "#CBD5E1",
  },
  monitoring: {
    bg: "rgba(168,85,247,0.10)",
    border: "#A855F7",
    glow: "rgba(168,85,247,0.30)",
    text: "#C4B5FD",
  },
};

interface ArchitectureNodeProps {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  /** Scale factor for responsive sizing (default 1) */
  scale?: number;
}

export default function ArchitectureNode({
  label,
  type,
  x,
  y,
  scale = 1,
}: ArchitectureNodeProps) {
  const colors = typeColors[type] ?? typeColors.external;

  const w = 130 * scale;
  const h = 52 * scale;
  const fontSize = Math.max(9, 11 * scale);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      whileHover={{
        scale: 1.08,
        boxShadow: `0 0 20px ${colors.glow}`,
      }}
      style={{
        position: "absolute",
        left: x * scale,
        top: y * scale,
        width: w,
        height: h,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 6px",
        cursor: "default",
        zIndex: 2,
      }}
    >
      <span
        style={{
          color: colors.text,
          fontSize,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.25,
          whiteSpace: "pre-line",
          userSelect: "none",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}
