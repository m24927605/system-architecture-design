"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { ArchNode, NodeType } from "@/data/architecture-nodes";
import { NODE_WIDTH, NODE_HEIGHT } from "@/data/architecture-nodes";

const edgeColorMap: Record<NodeType, string> = {
  api: "#6366F1",
  worker: "#22D3EE",
  queue: "#F59E0B",
  db: "#10B981",
  cache: "#34D399",
  gpu: "#EF4444",
  cdn: "#3B82F6",
  lb: "#3B82F6",
  external: "#64748B",
  user: "#64748B",
  monitoring: "#A855F7",
};

/** Number of flowing dots per edge */
const DOT_COUNT = 3;
/** Total animation duration in seconds (slower = gentler wave) */
const FLOW_DURATION = 5;

interface ArchitectureEdgeProps {
  sourceNode: ArchNode;
  targetNode: ArchNode;
  scale?: number;
}

export default function ArchitectureEdge({
  sourceNode,
  targetNode,
  scale = 1,
}: ArchitectureEdgeProps) {
  const sw = NODE_WIDTH * scale;
  const sh = NODE_HEIGHT * scale;

  const sx = sourceNode.position.x * scale + sw / 2;
  const sy = sourceNode.position.y * scale + sh / 2;
  const tx = targetNode.position.x * scale + sw / 2;
  const ty = targetNode.position.y * scale + sh / 2;

  const color = edgeColorMap[sourceNode.type] ?? "#64748B";

  /* Curved path for a softer look */
  const dx = tx - sx;
  const dy = ty - sy;
  const cx1 = sx + dx * 0.35;
  const cy1 = sy + dy * 0.05;
  const cx2 = sx + dx * 0.65;
  const cy2 = ty - dy * 0.05;

  const d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;

  const edgeId = `edge-${sourceNode.id}-${targetNode.id}`;

  /* Staggered delay for each dot to create wave spacing */
  const dots = useMemo(
    () =>
      Array.from({ length: DOT_COUNT }, (_, i) => ({
        key: i,
        delay: (FLOW_DURATION / DOT_COUNT) * i,
      })),
    [],
  );

  const dotRadius = Math.max(2, 2.5 * scale);

  return (
    <g>
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${edgeId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.5 * scale} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static base line — subtle */}
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={1 * scale}
        strokeOpacity={0.15}
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Hidden path for animateMotion reference */}
      <path id={edgeId} d={d} fill="none" stroke="none" />

      {/* Flowing dots along the path */}
      {dots.map((dot) => (
        <circle
          key={dot.key}
          r={dotRadius}
          fill={color}
          opacity={0}
          filter={`url(#glow-${edgeId})`}
        >
          <animateMotion
            dur={`${FLOW_DURATION}s`}
            repeatCount="indefinite"
            begin={`${dot.delay}s`}
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.42 0 0.58 1"
          >
            <mpath href={`#${edgeId}`} />
          </animateMotion>
          {/* Fade in, hold, fade out — wave pulse */}
          <animate
            attributeName="opacity"
            values="0;0.9;0.9;0"
            keyTimes="0;0.1;0.85;1"
            dur={`${FLOW_DURATION}s`}
            repeatCount="indefinite"
            begin={`${dot.delay}s`}
          />
        </circle>
      ))}
    </g>
  );
}
