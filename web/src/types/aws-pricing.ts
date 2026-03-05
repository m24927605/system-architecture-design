export interface Ec2Pricing {
  region: string;
  onDemandPerHour: number;
  reserved1yrNoUpfrontPerHour?: number;
  reserved1yrAllUpfrontPerHour?: number;
  sourceUrl: string;
}

export interface TranscribePricing {
  perMinute: number;
  sourceUrl: string;
}

export interface BedrockModelPricing {
  displayName: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  sourceUrl: string;
  manualEntry?: boolean;
}

export interface AwsPricingSnapshot {
  lastUpdated: string;
  ec2: Record<string, Ec2Pricing>;
  transcribe: { standard: TranscribePricing };
  bedrock: Record<string, BedrockModelPricing>;
}
