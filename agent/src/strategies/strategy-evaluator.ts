export type StrategyType = 'yield-optimiser' | 'rebalance' | 'dca' | 'exit';

export type EvaluationDecision = 'execute' | 'wait' | 'error';

export interface ProtocolHealth {
  healthy: boolean;
  reason?: string;
}

export interface MarketContext {
  protocolHealth: Record<string, ProtocolHealth | undefined>;
  assetPrices: Record<string, number | undefined>;
  estimatedGasCost?: number;
  estimatedRebalanceBenefit?: number;
  triggeredExitSignals?: string[];
}

export interface VaultEvaluationState {
  vaultId: bigint;
  strategyId: bigint;
  currentBlock: number;
  lastExecutionBlock?: number | null;
  currentApyBps?: number;
  currentWeights?: Record<string, number>;
  uninvestedBalance: bigint;
}

export interface BaseStrategyConfiguration {
  strategyId: bigint;
  strategyType: StrategyType;
  enabled: boolean;
}

export interface YieldOptimiserStrategyConfiguration extends BaseStrategyConfiguration {
  strategyType: 'yield-optimiser';
  cooldownBlocks: number;
  targetApyBps: number;
  requiredProtocols: string[];
}

export interface RebalanceStrategyConfiguration extends BaseStrategyConfiguration {
  strategyType: 'rebalance';
  minRebalanceIntervalBlocks: number;
  driftToleranceBps: number;
  targetWeights: Record<string, number>;
  maxGasCostToBenefitRatio: number;
}

export interface DCAStrategyConfiguration extends BaseStrategyConfiguration {
  strategyType: 'dca';
  dcaIntervalBlocks: number;
  trancheAmount: bigint;
}

export type ExitTrigger =
  | {
      type: 'price-below';
      asset: string;
      threshold: number;
    }
  | {
      type: 'manual-signal';
      signal: string;
    };

export interface ExitStrategyConfiguration extends BaseStrategyConfiguration {
  strategyType: 'exit';
  exitTriggers: ExitTrigger[];
}

export type StrategyConfiguration =
  | YieldOptimiserStrategyConfiguration
  | RebalanceStrategyConfiguration
  | DCAStrategyConfiguration
  | ExitStrategyConfiguration;

export interface StrategyEvaluationInput<TStrategy extends StrategyConfiguration = StrategyConfiguration> {
  vault: VaultEvaluationState;
  strategy: TStrategy;
  market: MarketContext;
}

export interface StrategyEvaluationResult {
  decision: EvaluationDecision;
  reason: string;
  errors?: string[];
}

export interface StrategyEvaluator<TStrategy extends StrategyConfiguration = StrategyConfiguration> {
  evaluate(input: StrategyEvaluationInput<TStrategy>): Promise<StrategyEvaluationResult> | StrategyEvaluationResult;
}

export function toExecute(reason: string): StrategyEvaluationResult {
  return {
    decision: 'execute',
    reason,
  };
}

export function toWait(reason: string): StrategyEvaluationResult {
  return {
    decision: 'wait',
    reason,
  };
}

export function toError(reason: string, errors: string[] = []): StrategyEvaluationResult {
  return {
    decision: 'error',
    reason,
    errors,
  };
}

export function blocksSinceLastExecution(currentBlock: number, lastExecutionBlock?: number | null): number | null {
  if (lastExecutionBlock === null || typeof lastExecutionBlock === 'undefined') {
    return null;
  }

  return Math.max(0, currentBlock - lastExecutionBlock);
}