import type { AwsPricingSnapshot } from "@/types/aws-pricing";

export interface CapacityInput {
  monthlyTasks: number;
  avgAudioMinutes: number;
  whisperRtf: number;
  bedrockModelKey: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  gpuTargetUtilization: number;
  llmTasksPerGpuPerMin: number;
}

export interface CapacityResult {
  recommendedPhase: 1 | 2 | 3;
  phaseName: string;
  sttGpus: number;
  llmGpus: number;
  gpuCostPerMonth: number;
  selfHostedMonthlyCost: number;
  transcribeMonthlyCost: number;
  bedrockCostPerTask: number;
  bedrockMonthlyCost: number;
  managedMonthlyCost: number;
  savings: number;
  sttTasksPerMinPerGpu: number;
  totalSttCapacity: number;
}

const HOURS_PER_MONTH = 730;
// EKS $73 + RDS Multi-AZ $95 + ElastiCache Multi-AZ $24 + ALB $21 + CloudWatch $10
const BASE_INFRA_COST = 223;
// RDS Single-AZ $12 + ElastiCache $12 + CloudWatch $10
const BASE_MANAGED_INFRA = 34;
export const DEFAULT_INPUT: CapacityInput = {
  monthlyTasks: 10000,
  avgAudioMinutes: 3,
  whisperRtf: 0.1,
  bedrockModelKey: "claude-3-haiku",
  avgInputTokens: 1500,
  avgOutputTokens: 500,
  gpuTargetUtilization: 0.7,
  llmTasksPerGpuPerMin: 40,
};

export function calculateCapacity(
  input: CapacityInput,
  pricing: AwsPricingSnapshot
): CapacityResult {
  const {
    monthlyTasks, avgAudioMinutes, whisperRtf, bedrockModelKey,
    avgInputTokens, avgOutputTokens, gpuTargetUtilization, llmTasksPerGpuPerMin,
  } = input;

  const tasksPerMin = monthlyTasks / (30 * 24 * 60);

  // STT throughput (corrected: accounts for audio length and RTF)
  const processingTimeSec = avgAudioMinutes * 60 * whisperRtf;
  const sttTasksPerMinPerGpu = 60 / processingTimeSec;
  const sttGpus = Math.max(1, Math.ceil(tasksPerMin / (sttTasksPerMinPerGpu * gpuTargetUtilization)));

  // LLM GPUs
  const llmGpus = Math.max(1, Math.ceil(tasksPerMin / (llmTasksPerGpuPerMin * gpuTargetUtilization)));

  // GPU cost (On-Demand from pricing)
  const ec2 = pricing.ec2["g5.xlarge"];
  const gpuCostPerMonth = ec2 ? ec2.onDemandPerHour * HOURS_PER_MONTH : 734;
  const selfHostedMonthlyCost = (sttGpus + llmGpus) * gpuCostPerMonth + BASE_INFRA_COST;

  // Managed cost
  const transcribeMonthlyCost = monthlyTasks * avgAudioMinutes * pricing.transcribe.standard.perMinute;

  const model = pricing.bedrock[bedrockModelKey];
  const bedrockCostPerTask = model
    ? (avgInputTokens / 1000) * model.inputPer1kTokens + (avgOutputTokens / 1000) * model.outputPer1kTokens
    : 0.001;
  const bedrockMonthlyCost = monthlyTasks * bedrockCostPerTask;
  const managedMonthlyCost = transcribeMonthlyCost + bedrockMonthlyCost + BASE_MANAGED_INFRA;

  // Savings
  const savings = managedMonthlyCost > 0
    ? Math.round(((managedMonthlyCost - selfHostedMonthlyCost) / managedMonthlyCost) * 100)
    : 0;

  // Phase recommendation
  let recommendedPhase: 1 | 2 | 3;
  let phaseName: string;
  if (monthlyTasks < 50000) { recommendedPhase = 1; phaseName = "MVP"; }
  else if (monthlyTasks < 500000) { recommendedPhase = 2; phaseName = "Growth"; }
  else { recommendedPhase = 3; phaseName = "Scale"; }

  const totalSttCapacity = sttGpus * sttTasksPerMinPerGpu;

  return {
    recommendedPhase, phaseName, sttGpus, llmGpus, gpuCostPerMonth,
    selfHostedMonthlyCost, transcribeMonthlyCost, bedrockCostPerTask,
    bedrockMonthlyCost, managedMonthlyCost, savings, sttTasksPerMinPerGpu,
    totalSttCapacity,
  };
}

export function generateCostCurveData(
  baseInput: CapacityInput,
  pricing: AwsPricingSnapshot
) {
  const taskVolumes = [1000, 5000, 10000, 30000, 50000, 100000, 200000, 500000, 1000000];
  return taskVolumes.map((tasks) => {
    const result = calculateCapacity({ ...baseInput, monthlyTasks: tasks }, pricing);
    return {
      tasks,
      managed: Math.round(result.managedMonthlyCost),
      selfHosted: Math.round(result.selfHostedMonthlyCost),
      managedPerTask: result.managedMonthlyCost / tasks,
      selfHostedPerTask: result.selfHostedMonthlyCost / tasks,
    };
  });
}
