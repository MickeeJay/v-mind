export type StrategyType = 'yield-harvest' | 'rebalance' | 'emergency-exit';

export interface StrategyEvaluationInput {
  vaultId: string;
  strategyType: StrategyType;
  blockHeight: number;
}

export interface StrategyEvaluationResult {
  shouldExecute: boolean;
  reason: string;
}

export interface StrategyEvaluator {
  evaluate(input: StrategyEvaluationInput): Promise<StrategyEvaluationResult>;
}