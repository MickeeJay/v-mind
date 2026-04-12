import { DCAEvaluator } from './dca-evaluator';
import { ExitEvaluator } from './exit-evaluator';
import { RebalanceEvaluator } from './rebalance-evaluator';
import {
  toError,
  type MarketContext,
  type StrategyConfiguration,
  type StrategyEvaluationResult,
  type StrategyEvaluator,
  type StrategyType,
  type VaultEvaluationState,
} from './strategy-evaluator';
import { YieldOptimiserEvaluator } from './yield-optimiser-evaluator';

export interface OnChainVaultRegistry {
  listActiveVaults(): Promise<VaultEvaluationState[]>;
}

export interface StrategyConfigurationRepository {
  getStrategyConfiguration(strategyId: bigint): Promise<StrategyConfiguration>;
}

export interface MarketContextProvider {
  getMarketContext(vault: VaultEvaluationState, strategy: StrategyConfiguration): Promise<MarketContext>;
}

export interface ReadyVaultExecution {
  vaultId: bigint;
  strategyId: bigint;
  strategyType: StrategyType;
  evaluation: StrategyEvaluationResult;
}

export interface StrategyEvaluatorFactory {
  getEvaluator(strategyType: StrategyType): StrategyEvaluator;
}

export class DefaultStrategyEvaluatorFactory implements StrategyEvaluatorFactory {
  private readonly evaluators: Record<StrategyType, StrategyEvaluator>;

  constructor(overrides: Partial<Record<StrategyType, StrategyEvaluator>> = {}) {
    this.evaluators = {
      'yield-optimiser': overrides['yield-optimiser'] ?? new YieldOptimiserEvaluator(),
      rebalance: overrides.rebalance ?? new RebalanceEvaluator(),
      dca: overrides.dca ?? new DCAEvaluator(),
      exit: overrides.exit ?? new ExitEvaluator(),
    };
  }

  getEvaluator(strategyType: StrategyType): StrategyEvaluator {
    return this.evaluators[strategyType];
  }
}

export interface EvaluationOrchestratorOptions {
  vaultRegistry: OnChainVaultRegistry;
  strategyRepository: StrategyConfigurationRepository;
  marketContextProvider: MarketContextProvider;
  evaluatorFactory?: StrategyEvaluatorFactory;
}

export class EvaluationOrchestrator {
  private readonly evaluatorFactory: StrategyEvaluatorFactory;

  constructor(private readonly options: EvaluationOrchestratorOptions) {
    this.evaluatorFactory = options.evaluatorFactory ?? new DefaultStrategyEvaluatorFactory();
  }

  async evaluateActiveVaults(): Promise<ReadyVaultExecution[]> {
    const activeVaults = await this.options.vaultRegistry.listActiveVaults();
    const readyVaults: ReadyVaultExecution[] = [];

    for (const vault of activeVaults) {
      const strategy = await this.options.strategyRepository.getStrategyConfiguration(vault.strategyId);
      if (!strategy.enabled) {
        continue;
      }

      const evaluator = this.options.evaluatorFactory?.getEvaluator(strategy.strategyType) ?? this.evaluatorFactory.getEvaluator(strategy.strategyType);
      const marketContext = await this.options.marketContextProvider.getMarketContext(vault, strategy);

      let evaluation: StrategyEvaluationResult;
      try {
        evaluation = await evaluator.evaluate({
          vault,
          strategy,
          market: marketContext,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown evaluation error';
        evaluation = toError('Strategy evaluator threw an exception', [reason]);
      }

      if (evaluation.decision === 'execute') {
        readyVaults.push({
          vaultId: vault.vaultId,
          strategyId: strategy.strategyId,
          strategyType: strategy.strategyType,
          evaluation,
        });
      }
    }

    return readyVaults;
  }
}