"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { phases, getDynamicMetrics } from "@/data/architecture-nodes";
import type { ArchNode } from "@/data/architecture-nodes";
import { phaseFlows } from "@/data/task-flow-steps";
import { useCapacity } from "@/contexts/CapacityContext";
import ArchitectureNode from "@/components/architecture/ArchitectureNode";
import ArchitectureEdge from "@/components/architecture/ArchitectureEdge";
import MetricsPanel from "@/components/architecture/MetricsPanel";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";

const PHASE_KEYS = ["phase1", "phase2", "phase3"] as const;
type PhaseKey = (typeof PHASE_KEYS)[number];

const TAB_LABEL_KEYS: Record<PhaseKey, string> = {
  phase1: "phase1",
  phase2: "phase2",
  phase3: "phase3",
};

/* The original data is designed for a ~900 x 500 canvas */
const BASE_W = 900;
const BASE_H = 520;

export default function ArchitectureEvolution() {
  const t = useTranslations("architecture");
  const [activePhase, setActivePhase] = useState<PhaseKey>("phase1");
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  /* Responsive scale – fit canvas into available width */
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setScale(Math.min(1, w / BASE_W));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const data = phases[activePhase];

  const { result, input } = useCapacity();
  const dynamicMetrics = useMemo(
    () => getDynamicMetrics(activePhase, result, input),
    [activePhase, result, input]
  );

  /* Build a node lookup map */
  const nodeMap = useMemo(() => {
    const m = new Map<string, ArchNode>();
    data.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [data.nodes]);

  /* Get current phase's flow steps */
  const currentFlowSteps = useMemo(() => {
    const pf = phaseFlows.find((p) => p.key === activePhase);
    return pf?.steps ?? [];
  }, [activePhase]);

  const handleTab = useCallback((key: PhaseKey) => {
    setActivePhase(key);
  }, []);

  return (
    <SectionWrapper id="architecture">
      {/* Header */}
      <h2 className="text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{t("title")}</GradientText>
      </h2>
      <p className="text-text-secondary mb-8 max-w-2xl">{t("subtitle")}</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 relative bg-bg-card/50 rounded-xl p-1 w-fit border border-border">
        {PHASE_KEYS.map((key) => {
          const isActive = key === activePhase;
          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={`relative z-10 px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="phase-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-start to-accent-end"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {t(TAB_LABEL_KEYS[key])}
            </button>
          );
        })}
      </div>

      {/* Content area: diagram + metrics */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Diagram */}
        <div
          ref={containerRef}
          className="flex-1 rounded-2xl border border-border bg-bg-card/40 overflow-visible"
          style={{ minHeight: BASE_H * scale + 20 }}
        >
          <div
            className="relative"
            style={{
              width: BASE_W * scale,
              height: BASE_H * scale,
              margin: "10px auto",
            }}
          >
            {/* SVG layer for edges */}
            <svg
              className="absolute inset-0"
              style={{ width: BASE_W * scale, height: BASE_H * scale }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <AnimatePresence>
                {data.edges.map((edge) => {
                  const src = nodeMap.get(edge.source);
                  const tgt = nodeMap.get(edge.target);
                  if (!src || !tgt) return null;
                  return (
                    <ArchitectureEdge
                      key={`${activePhase}-${edge.id}`}
                      sourceNode={src}
                      targetNode={tgt}
                      scale={scale}
                    />
                  );
                })}
              </AnimatePresence>
            </svg>

            {/* Node layer */}
            <AnimatePresence mode="popLayout">
              {data.nodes.map((node) => {
                const nodeFlowSteps = node.steps
                  ? currentFlowSteps.filter((s) => node.steps!.includes(s.id))
                  : undefined;

                return (
                  <ArchitectureNode
                    key={`${activePhase}-${node.id}`}
                    id={node.id}
                    label={node.label}
                    type={node.type}
                    x={node.position.x}
                    y={node.position.y}
                    scale={scale}
                    steps={node.steps}
                    flowSteps={nodeFlowSteps}
                    canvasWidth={BASE_W * scale}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Metrics panel */}
        <MetricsPanel metrics={dynamicMetrics} phaseKey={activePhase} />
      </div>
    </SectionWrapper>
  );
}
