export type NodeType =
  | "api"
  | "worker"
  | "queue"
  | "db"
  | "cache"
  | "gpu"
  | "cdn"
  | "lb"
  | "external"
  | "user"
  | "monitoring";

export interface ArchNode {
  id: string;
  label: string;
  type: NodeType;
  position: { x: number; y: number };
  /** Task-flow step numbers this node participates in */
  steps?: number[];
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
}

export interface PhaseMetrics {
  monthlyCost: string;
  throughput: string;
  compute: string;
  aiModels: string;
  deployment: string;
}

export interface PhaseData {
  nodes: ArchNode[];
  edges: ArchEdge[];
  metrics: PhaseMetrics;
}

/* ------------------------------------------------------------------ */
/*  Phase 1: MVP  — ECS Fargate + Managed AI                         */
/* ------------------------------------------------------------------ */
const phase1: PhaseData = {
  nodes: [
    { id: "user", label: "User", type: "user", position: { x: 40, y: 220 }, steps: [1, 2, 8] },
    {
      id: "api",
      label: "API Service\n(ECS Fargate, Go+Echo)",
      type: "api",
      position: { x: 200, y: 220 },
      steps: [1, 3, 4],
    },
    {
      id: "s3",
      label: "S3",
      type: "db",
      position: { x: 380, y: 80 },
      steps: [2],
    },
    {
      id: "sqs",
      label: "SQS\n(Single Queue)",
      type: "queue",
      position: { x: 380, y: 220 },
      steps: [4],
    },
    {
      id: "stt-worker",
      label: "STT Worker\n(Fargate)",
      type: "worker",
      position: { x: 560, y: 140 },
      steps: [5],
    },
    {
      id: "llm-worker",
      label: "LLM Worker\n(Fargate)",
      type: "worker",
      position: { x: 560, y: 300 },
      steps: [6],
    },
    {
      id: "aws-transcribe",
      label: "AWS Transcribe",
      type: "external",
      position: { x: 740, y: 140 },
      steps: [5],
    },
    {
      id: "bedrock",
      label: "Amazon Bedrock",
      type: "external",
      position: { x: 740, y: 300 },
      steps: [6],
    },
    {
      id: "rds",
      label: "RDS PostgreSQL\n(Single-AZ)",
      type: "db",
      position: { x: 200, y: 400 },
      steps: [3, 7],
    },
    {
      id: "redis",
      label: "ElastiCache Redis\n(Single)",
      type: "cache",
      position: { x: 380, y: 400 },
      steps: [8],
    },
  ],
  edges: [
    { id: "e-user-api", source: "user", target: "api" },
    { id: "e-user-s3", source: "user", target: "s3" },
    { id: "e-api-sqs", source: "api", target: "sqs" },
    { id: "e-sqs-stt", source: "sqs", target: "stt-worker" },
    { id: "e-sqs-llm", source: "sqs", target: "llm-worker" },
    { id: "e-stt-transcribe", source: "stt-worker", target: "aws-transcribe" },
    { id: "e-llm-bedrock", source: "llm-worker", target: "bedrock" },
    { id: "e-api-rds", source: "api", target: "rds" },
    { id: "e-api-redis", source: "api", target: "redis" },
  ],
  metrics: {
    monthlyCost: "$800 – $1,500",
    throughput: "~50 tasks/min",
    compute: "ECS Fargate",
    aiModels: "AWS Transcribe + Bedrock",
    deployment: "Rolling Update",
  },
};

/* ------------------------------------------------------------------ */
/*  Phase 2: Growth — EKS + Self-Hosted GPU, Two-Stage Queues        */
/* ------------------------------------------------------------------ */
const phase2: PhaseData = {
  nodes: [
    { id: "user", label: "User", type: "user", position: { x: 20, y: 210 }, steps: [1, 2, 9] },
    {
      id: "alb",
      label: "ALB",
      type: "lb",
      position: { x: 130, y: 210 },
      steps: [1, 9],
    },
    {
      id: "api",
      label: "API Service\n(EKS)",
      type: "api",
      position: { x: 260, y: 210 },
      steps: [1, 3, 4],
    },
    {
      id: "stt-queue",
      label: "STT Queue\n(SQS)",
      type: "queue",
      position: { x: 410, y: 110 },
      steps: [4],
    },
    {
      id: "llm-queue",
      label: "LLM Queue\n(SQS)",
      type: "queue",
      position: { x: 410, y: 310 },
      steps: [6],
    },
    {
      id: "dlq",
      label: "DLQ",
      type: "queue",
      position: { x: 410, y: 430 },
      steps: [8],
    },
    {
      id: "stt-worker",
      label: "STT Worker",
      type: "worker",
      position: { x: 560, y: 110 },
      steps: [5, 6],
    },
    {
      id: "llm-worker",
      label: "LLM Worker",
      type: "worker",
      position: { x: 560, y: 310 },
      steps: [7, 8],
    },
    {
      id: "whisper",
      label: "Whisper Server\n(GPU)",
      type: "gpu",
      position: { x: 720, y: 110 },
      steps: [5],
    },
    {
      id: "vllm",
      label: "vLLM Server\n(GPU)",
      type: "gpu",
      position: { x: 720, y: 310 },
      steps: [7],
    },
    {
      id: "s3",
      label: "S3",
      type: "db",
      position: { x: 260, y: 60 },
      steps: [2],
    },
    {
      id: "rds",
      label: "RDS PostgreSQL\n(Multi-AZ)",
      type: "db",
      position: { x: 130, y: 400 },
      steps: [3, 6, 8],
    },
    {
      id: "redis",
      label: "ElastiCache\n(Multi-AZ)",
      type: "cache",
      position: { x: 260, y: 400 },
      steps: [9],
    },
    {
      id: "monitoring",
      label: "Prometheus\n+ Grafana",
      type: "monitoring",
      position: { x: 720, y: 430 },
    },
  ],
  edges: [
    { id: "e-user-alb", source: "user", target: "alb" },
    { id: "e-user-s3", source: "user", target: "s3" },
    { id: "e-alb-api", source: "alb", target: "api" },
    { id: "e-api-stt-q", source: "api", target: "stt-queue" },
    { id: "e-api-llm-q", source: "api", target: "llm-queue" },
    { id: "e-stt-q-worker", source: "stt-queue", target: "stt-worker" },
    { id: "e-llm-q-worker", source: "llm-queue", target: "llm-worker" },
    { id: "e-stt-whisper", source: "stt-worker", target: "whisper" },
    { id: "e-llm-vllm", source: "llm-worker", target: "vllm" },
    { id: "e-stt-q-dlq", source: "stt-queue", target: "dlq" },
    { id: "e-llm-q-dlq", source: "llm-queue", target: "dlq" },
    { id: "e-api-rds", source: "api", target: "rds" },
    { id: "e-api-redis", source: "api", target: "redis" },
    { id: "e-whisper-mon", source: "whisper", target: "monitoring" },
    { id: "e-vllm-mon", source: "vllm", target: "monitoring" },
  ],
  metrics: {
    monthlyCost: "$3,000 – $6,000",
    throughput: "~10-50 tasks/min",
    compute: "EKS",
    aiModels: "Whisper + vLLM (1 GPU each)",
    deployment: "Rolling Update",
  },
};

/* ------------------------------------------------------------------ */
/*  Phase 3: Scale — Full setup with KEDA, GPU pools, Argo Rollouts  */
/* ------------------------------------------------------------------ */
const phase3: PhaseData = {
  nodes: [
    { id: "user", label: "User", type: "user", position: { x: 10, y: 220 }, steps: [1, 2, 9] },
    {
      id: "cloudfront",
      label: "CloudFront",
      type: "cdn",
      position: { x: 100, y: 220 },
      steps: [1, 9],
    },
    {
      id: "alb",
      label: "ALB",
      type: "lb",
      position: { x: 200, y: 220 },
      steps: [1, 9],
    },
    {
      id: "api",
      label: "API Service\n(HPA)",
      type: "api",
      position: { x: 310, y: 220 },
      steps: [1, 3, 4],
    },
    {
      id: "stt-queue",
      label: "STT Queue",
      type: "queue",
      position: { x: 440, y: 100 },
      steps: [4],
    },
    {
      id: "llm-queue",
      label: "LLM Queue",
      type: "queue",
      position: { x: 440, y: 340 },
      steps: [6],
    },
    {
      id: "dlq",
      label: "DLQ",
      type: "queue",
      position: { x: 440, y: 450 },
      steps: [8],
    },
    {
      id: "stt-workers",
      label: "STT Workers\n(KEDA)",
      type: "worker",
      position: { x: 580, y: 60 },
      steps: [5, 6],
    },
    {
      id: "llm-workers",
      label: "LLM Workers\n(KEDA)",
      type: "worker",
      position: { x: 580, y: 300 },
      steps: [7, 8],
    },
    {
      id: "whisper-pool",
      label: "Whisper\nGPU Pool",
      type: "gpu",
      position: { x: 730, y: 60 },
      steps: [5],
    },
    {
      id: "vllm-pool",
      label: "vLLM\nGPU Pool",
      type: "gpu",
      position: { x: 730, y: 300 },
      steps: [7],
    },
    {
      id: "s3",
      label: "S3",
      type: "db",
      position: { x: 310, y: 60 },
      steps: [2],
    },
    {
      id: "rds",
      label: "RDS Multi-AZ\n+ Read Replica",
      type: "db",
      position: { x: 100, y: 410 },
      steps: [3, 6, 8],
    },
    {
      id: "redis",
      label: "ElastiCache\nCluster",
      type: "cache",
      position: { x: 230, y: 410 },
      steps: [9],
    },
    {
      id: "argo",
      label: "Argo Rollouts",
      type: "api",
      position: { x: 580, y: 450 },
    },
    {
      id: "observability",
      label: "Full Observability\nStack",
      type: "monitoring",
      position: { x: 730, y: 450 },
    },
  ],
  edges: [
    { id: "e-user-cf", source: "user", target: "cloudfront" },
    { id: "e-user-s3", source: "user", target: "s3" },
    { id: "e-cf-alb", source: "cloudfront", target: "alb" },
    { id: "e-alb-api", source: "alb", target: "api" },
    { id: "e-api-stt-q", source: "api", target: "stt-queue" },
    { id: "e-api-llm-q", source: "api", target: "llm-queue" },
    { id: "e-stt-q-workers", source: "stt-queue", target: "stt-workers" },
    { id: "e-llm-q-workers", source: "llm-queue", target: "llm-workers" },
    { id: "e-stt-whisper", source: "stt-workers", target: "whisper-pool" },
    { id: "e-llm-vllm", source: "llm-workers", target: "vllm-pool" },
    { id: "e-stt-q-dlq", source: "stt-queue", target: "dlq" },
    { id: "e-llm-q-dlq", source: "llm-queue", target: "dlq" },
    { id: "e-api-rds", source: "api", target: "rds" },
    { id: "e-api-redis", source: "api", target: "redis" },
    { id: "e-api-argo", source: "api", target: "argo" },
    { id: "e-whisper-obs", source: "whisper-pool", target: "observability" },
    { id: "e-vllm-obs", source: "vllm-pool", target: "observability" },
  ],
  metrics: {
    monthlyCost: "$10,000 – $25,000",
    throughput: "~1,000+ tasks/min",
    compute: "EKS + KEDA",
    aiModels: "Multi-GPU Pool",
    deployment: "Argo Rollouts (Canary)",
  },
};

export const phases: Record<string, PhaseData> = {
  phase1,
  phase2,
  phase3,
};

/* Node dimensions (used for edge calculations) */
export const NODE_WIDTH = 130;
export const NODE_HEIGHT = 52;

/* ------------------------------------------------------------------ */
/*  Dynamic metrics — merge capacity-calculator results into phase    */
/* ------------------------------------------------------------------ */
import type { CapacityResult, CapacityInput } from "@/data/capacity";

export function getDynamicMetrics(
  phaseKey: string,
  result: CapacityResult,
  input: CapacityInput
): PhaseMetrics {
  const base = phases[phaseKey]?.metrics;
  if (!base) return phases.phase1.metrics;

  if (phaseKey === "phase1") {
    return {
      ...base,
      monthlyCost: `$${Math.round(result.managedMonthlyCost).toLocaleString()}`,
      throughput: `~${result.totalSttCapacity.toFixed(0)} tasks/min`,
    };
  }

  return {
    ...base,
    monthlyCost: `$${Math.round(result.selfHostedMonthlyCost).toLocaleString()}`,
    throughput: `~${result.totalSttCapacity.toFixed(0)} tasks/min`,
    aiModels:
      phaseKey === "phase2"
        ? `Whisper (RTF ${input.whisperRtf}) + vLLM (${result.sttGpus}+${result.llmGpus} GPUs)`
        : `Multi-GPU Pool (${result.sttGpus}+${result.llmGpus} GPUs)`,
  };
}
