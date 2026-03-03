export interface CapacityResult {
  recommendedPhase: 1 | 2 | 3;
  phaseName: string;
  sttGpus: number;
  llmGpus: number;
  selfHostedCost: number;
  managedCost: number;
  savings: number;
}

const STT_TASKS_PER_GPU_PER_MIN = 10;
const LLM_TASKS_PER_GPU_PER_MIN = 40;
const GPU_COST_PER_MONTH = 420;
const TRANSCRIBE_COST_PER_MIN = 0.024;
const BEDROCK_COST_PER_TASK = 0.003;
const GPU_TARGET_UTILIZATION = 0.7;
const BASE_INFRA_COST = 500;
const BASE_MANAGED_INFRA = 100;

export function calculateCapacity(
  monthlyTasks: number,
  avgAudioMinutes: number
): CapacityResult {
  const tasksPerMin = monthlyTasks / (30 * 24 * 60);

  const sttGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (STT_TASKS_PER_GPU_PER_MIN * GPU_TARGET_UTILIZATION))
  );
  const llmGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (LLM_TASKS_PER_GPU_PER_MIN * GPU_TARGET_UTILIZATION))
  );

  const selfHostedCost =
    (sttGpus + llmGpus) * GPU_COST_PER_MONTH + BASE_INFRA_COST;
  const managedCost =
    monthlyTasks * avgAudioMinutes * TRANSCRIBE_COST_PER_MIN +
    monthlyTasks * BEDROCK_COST_PER_TASK +
    BASE_MANAGED_INFRA;

  const savings =
    managedCost > 0
      ? Math.round(((managedCost - selfHostedCost) / managedCost) * 100)
      : 0;

  let recommendedPhase: 1 | 2 | 3;
  let phaseName: string;
  if (monthlyTasks < 50000) {
    recommendedPhase = 1;
    phaseName = "MVP";
  } else if (monthlyTasks < 500000) {
    recommendedPhase = 2;
    phaseName = "Growth";
  } else {
    recommendedPhase = 3;
    phaseName = "Scale";
  }

  return {
    recommendedPhase,
    phaseName,
    sttGpus,
    llmGpus,
    selfHostedCost,
    managedCost,
    savings,
  };
}
