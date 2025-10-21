export type TimeHorizon = 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
export type RiskAppetite = 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface TimeHorizonOption {
  value: TimeHorizon;
  name: string;
  description: string;
  interval: string;
  candleStick: string;
  executionFrequency: string;
  lookbackPeriod: string;
  indicators: {
    rsiPeriod: number;
    maPeriod: number;
    bbPeriod: number;
  };
}

export interface RiskAppetiteOption {
  value: RiskAppetite;
  name: string;
  description: string;
  stopLoss: number;
  takeProfit: number;
  maxPositionSize: number;
  kellyFraction: number;
  rebalanceThreshold: number;
}

export interface CombinationInfo {
  key: string;
  recommended: boolean;
  warning?: string;
  suitableFor: string;
}

export interface MergedConfig {
  timeHorizon: TimeHorizonOption & { value: TimeHorizon };
  riskAppetite: RiskAppetiteOption & { value: RiskAppetite };
  combination: CombinationInfo;
  mergedParams: {
    interval: string;
    candleStick: string;
    executionFrequency: string;
    lookbackPeriod: string;
    stopLoss: number;
    takeProfit: number;
    maxPositionSize: number;
    kellyFraction: number;
    rebalanceThreshold: number;
    indicators: {
      rsiPeriod: number;
      maPeriod: number;
      bbPeriod: number;
    };
  };
}

export interface BotWizardState {
  currentStep: number;
  timeHorizon: TimeHorizon | null;
  riskAppetite: RiskAppetite | null;
  botName: string;
  symbol: string;
  fundAllocation: number;
}

export interface StrategyOptionsResponse {
  success: boolean;
  timeHorizons: TimeHorizonOption[];
  riskAppetites: RiskAppetiteOption[];
  combinationMatrix: Record<string, CombinationInfo>;
}
