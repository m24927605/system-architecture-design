"use client";

import { motion } from "framer-motion";
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

  /* centre of each node */
  const sx = sourceNode.position.x * scale + sw / 2;
  const sy = sourceNode.position.y * scale + sh / 2;
  const tx = targetNode.position.x * scale + sw / 2;
  const ty = targetNode.position.y * scale + sh / 2;

  const color = edgeColorMap[sourceNode.type] ?? "#64748B";

  /* Straight path */
  const d = `M ${sx} ${sy} L ${tx} ${ty}`;

  return (
    <motion.path
      d={d}
      stroke={color}
      strokeWidth={1.2 * scale}
      strokeOpacity={0.45}
      fill="none"
      strokeDasharray={`${6 * scale} ${4 * scale}`}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      exit={{ pathLength: 0, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* animated dash offset for a flowing effect */}
      <animate
        attributeName="stroke-dashoffset"
        from={`${20 * scale}`}
        to="0"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </motion.path>
  );
}
