export type StrategyType = 'yield-harvest' | 'rebalance' | 'emergency-exit';

export interface StrategyEvaluationInput {
  vaultId: string;
  strategyType: StrategyType;
  blockHeight: number;
  lastExecutionBlock: number;
  emergencyExitRequested?: boolean;
}

export interface StrategyEvaluationResult {
  shouldExecute: boolean;
  reason: string;
}

export interface StrategyEvaluator {
  evaluate(input: StrategyEvaluationInput): Promise<StrategyEvaluationResult>;
}

export interface StrategyPolicy {
  minBlockInterval: number;
}

export type StrategyPolicies = Record<StrategyType, StrategyPolicy>;

const DEFAULT_POLICIES: StrategyPolicies = {
  'yield-harvest': { minBlockInterval: 6 },
  rebalance: { minBlockInterval: 12 },
  'emergency-exit': { minBlockInterval: 1 },
};

export class DefaultStrategyEvaluator implements StrategyEvaluator {
  constructor(private readonly policies: StrategyPolicies = DEFAULT_POLICIES) {}

  async evaluate(input: StrategyEvaluationInput): Promise<StrategyEvaluationResult> {
    if (input.strategyType === 'emergency-exit' && input.emergencyExitRequested) {
      return {
        shouldExecute: true,
        reason: 'Emergency exit requested',
      };
    }

    const policy = this.policies[input.strategyType];
    const blocksSinceExecution = input.blockHeight - input.lastExecutionBlock;
    if (blocksSinceExecution < policy.minBlockInterval) {
      return {
        shouldExecute: false,
        reason: `Cooldown active (${blocksSinceExecution}/${policy.minBlockInterval} blocks)`,
      };
    }

    return {
      shouldExecute: true,
      reason: 'Strategy conditions met',
    };
  }
}