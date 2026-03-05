"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import type { NodeType } from "@/data/architecture-nodes";
import type { FlowStep } from "@/data/task-flow-steps";

export const typeColors: Record<
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
  scale?: number;
  steps?: number[];
  flowSteps?: FlowStep[];
  canvasWidth?: number;
}

export default function ArchitectureNode({
  label,
  type,
  x,
  y,
  scale = 1,
  flowSteps,
  canvasWidth,
}: ArchitectureNodeProps) {
  const colors = typeColors[type] ?? typeColors.external;
  const locale = useLocale();
  const isZh = locale === "zh";

  const [hovered, setHovered] = useState(false);
  const [tooltipSide, setTooltipSide] = useState<"bottom" | "top">("bottom");
  const [tooltipAlign, setTooltipAlign] = useState<"left" | "center" | "right">("center");
  const nodeRef = useRef<HTMLDivElement>(null);

  const w = 130 * scale;
  const h = 52 * scale;
  const fontSize = Math.max(9, 11 * scale);
  const tooltipW = Math.max(280, 320 * scale);

  const hasSteps = flowSteps && flowSteps.length > 0;

  useEffect(() => {
    if (!hovered || !nodeRef.current) return;
    const nodeLeft = x * scale;
    const nodeTop = y * scale;
    const cw = canvasWidth ?? 900 * scale;

    setTooltipSide(nodeTop + h + 120 > 520 * scale ? "top" : "bottom");

    const tooltipCenter = nodeLeft + w / 2;
    if (tooltipCenter - tooltipW / 2 < 0) {
      setTooltipAlign("left");
    } else if (tooltipCenter + tooltipW / 2 > cw) {
      setTooltipAlign("right");
    } else {
      setTooltipAlign("center");
    }
  }, [hovered, x, y, scale, w, h, tooltipW, canvasWidth]);

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    width: tooltipW,
    ...(tooltipSide === "bottom" ? { top: h + 8 * scale } : { bottom: h + 8 * scale }),
    ...(tooltipAlign === "center"
      ? { left: "50%", transform: "translateX(-50%)" }
      : tooltipAlign === "left"
        ? { left: 0 }
        : { right: 0 }),
    zIndex: 50,
    pointerEvents: "none",
  };

  return (
    <motion.div
      ref={nodeRef}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        cursor: hasSteps ? "pointer" : "default",
        zIndex: hovered ? 20 : 2,
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

      <AnimatePresence>
        {hovered && hasSteps && (
          <motion.div
            initial={{ opacity: 0, y: tooltipSide === "bottom" ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: tooltipSide === "bottom" ? -4 : 4 }}
            transition={{ duration: 0.15 }}
            style={tooltipStyle}
          >
            <div
              style={{
                background: "rgba(18,18,26,0.96)",
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: `${8 * scale}px ${10 * scale}px`,
                backdropFilter: "blur(12px)",
                boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${colors.glow}`,
              }}
            >
              {flowSteps!.map((step, idx) => {
                const actor = isZh ? step.actorZh : step.actor;
                const action = isZh ? step.actionZh : step.action;
                const target = isZh ? step.targetZh : step.target;
                const detail = isZh ? step.detailZh : step.detail;
                const actorColor = typeColors[step.actorType]?.text ?? "#94A3B8";
                const targetColor = typeColors[step.targetType]?.text ?? "#94A3B8";

                return (
                  <div
                    key={step.id}
                    style={{
                      padding: `${5 * scale}px 0`,
                      borderBottom:
                        idx < flowSteps!.length - 1
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5 * scale,
                        fontSize: Math.max(10, 11.5 * scale),
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Actor — colored by actorType */}
                      <span style={{ color: actorColor, fontWeight: 600 }}>
                        {actor}
                      </span>
                      <span style={{ color: "#475569" }}>→</span>
                      {/* Action — monospace neutral */}
                      <span
                        style={{
                          color: "#CBD5E1",
                          fontFamily: "monospace",
                          fontSize: Math.max(9, 10 * scale),
                          background: "rgba(255,255,255,0.05)",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        {action}
                      </span>
                      <span style={{ color: "#475569" }}>→</span>
                      {/* Target — colored by targetType */}
                      <span style={{ color: targetColor, fontWeight: 500 }}>
                        {target}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 3 * scale,
                        marginLeft: 0,
                        fontSize: Math.max(9, 10 * scale),
                        color: "#64748B",
                        lineHeight: 1.4,
                      }}
                    >
                      {detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
