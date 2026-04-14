export type StrategySortKey = 'apy' | 'name';

export type StrategyFilterType = 'all' | 'yield' | 'rebalance' | 'dca' | 'exit';

export type StrategyFilterRisk = 'all' | 'conservative' | 'moderate' | 'aggressive';

export type StrategyDetailSeriesPoint = {
  date: string;
  returnPercent: number;
};

export interface StrategyBrowserStrategy {
  id: bigint;
  name: string;
  strategyType: bigint;
  strategyTypeLabel: string;
  riskTier: bigint;
  riskLabel: string;
  targetProtocolPrincipal: string;
  targetAssetSymbol: string;
  estimatedApyRange: string;
  description: string;
  active: boolean;
  compatibleProtocols: string[];
  executionConditions: string[];
  feeStructure: string;
  detailedExplanation: string;
  historicalPerformance: StrategyDetailSeriesPoint[];
}
