import { describe, expect, it, vi } from 'vitest';
import type {
  MarketContextProvider,
  OnChainVaultRegistry,
  StrategyConfigurationRepository,
  StrategyEvaluatorFactory,
} from './evaluation-orchestrator';
import { EvaluationOrchestrator } from './evaluation-orchestrator';
import type {
  DCAStrategyConfiguration,
  ExitStrategyConfiguration,
  RebalanceStrategyConfiguration,
  StrategyConfiguration,
  StrategyEvaluationResult,
  YieldOptimiserStrategyConfiguration,
  StrategyType,
  VaultEvaluationState,
} from './strategy-evaluator';

const activeVaults: VaultEvaluationState[] = [
  {
    vaultId: 21n,
    strategyId: 1n,
    currentBlock: 100,
    lastExecutionBlock: 80,
    currentApyBps: 900,
    uninvestedBalance: 5_000n,
  },
  {
    vaultId: 22n,
    strategyId: 2n,
    currentBlock: 100,
    lastExecutionBlock: 50,
    currentWeights: { stx: 0.6, alex: 0.4 },
    uninvestedBalance: 0n,
  },
  {
    vaultId: 23n,
    strategyId: 3n,
    currentBlock: 100,
    lastExecutionBlock: null,
    uninvestedBalance: 2_000n,
  },
  {
    vaultId: 24n,
    strategyId: 4n,
    currentBlock: 100,
    lastExecutionBlock: 99,
    uninvestedBalance: 0n,
  },
];

const strategiesById: Record<string, StrategyConfiguration> = {
  '1': {
    strategyId: 1n,
    strategyType: 'yield-optimiser',
    enabled: true,
    cooldownBlocks: 10,
    targetApyBps: 1_200,
    requiredProtocols: ['zest'],
  } satisfies YieldOptimiserStrategyConfiguration,
  '2': {
    strategyId: 2n,
    strategyType: 'rebalance',
    enabled: true,
    minRebalanceIntervalBlocks: 10,
    driftToleranceBps: 300,
    targetWeights: { stx: 0.5, alex: 0.5 },
    maxGasCostToBenefitRatio: 0.2,
  } satisfies RebalanceStrategyConfiguration,
  '3': {
    strategyId: 3n,
    strategyType: 'dca',
    enabled: false,
    dcaIntervalBlocks: 12,
    trancheAmount: 100n,
  } satisfies DCAStrategyConfiguration,
  '4': {
    strategyId: 4n,
    strategyType: 'exit',
    enabled: true,
    exitTriggers: [
      {
        type: 'manual-signal',
        signal: 'panic',
      },
    ],
  } satisfies ExitStrategyConfiguration,
};

function createOrchestratorSetup(options?: {
  perTypeResult?: Partial<Record<StrategyType, StrategyEvaluationResult>>;
  throwsForType?: StrategyType;
}) {
  const getEvaluator = vi.fn((type: StrategyType) => {
    return {
      evaluate: vi.fn(async () => {
        if (options?.throwsForType === type) {
          throw new Error('boom');
        }

        return (
          options?.perTypeResult?.[type] ?? {
            decision: 'wait',
            reason: `wait:${type}`,
          }
        );
      }),
    };
  });

  const vaultRegistry: OnChainVaultRegistry = {
    listActiveVaults: vi.fn(async () => activeVaults),
  };

  const strategyRepository: StrategyConfigurationRepository = {
    getStrategyConfiguration: vi.fn(async (strategyId: bigint) => {
      return strategiesById[strategyId.toString()];
    }),
  };

  const marketContextProvider: MarketContextProvider = {
    getMarketContext: vi.fn(async () => ({
      protocolHealth: {},
      assetPrices: {},
      estimatedGasCost: 1,
      estimatedRebalanceBenefit: 10,
      triggeredExitSignals: [],
    })),
  };

  const evaluatorFactory: StrategyEvaluatorFactory = {
    getEvaluator,
  };

  return {
    getEvaluator,
    vaultRegistry,
    strategyRepository,
    marketContextProvider,
    orchestrator: new EvaluationOrchestrator({
      vaultRegistry,
      strategyRepository,
      marketContextProvider,
      evaluatorFactory,
    }),
  };
}

describe('EvaluationOrchestrator', () => {
  it('returns an empty list when no active vaults are returned by registry', async () => {
    const setup = createOrchestratorSetup();
    vi.mocked(setup.vaultRegistry.listActiveVaults).mockResolvedValueOnce([]);

    const ready = await setup.orchestrator.evaluateActiveVaults();

    expect(ready).toEqual([]);
  });

  it('returns only vaults with execute decisions', async () => {
    const setup = createOrchestratorSetup({
      perTypeResult: {
        'yield-optimiser': { decision: 'execute', reason: 'ok' },
        rebalance: { decision: 'wait', reason: 'wait' },
        exit: { decision: 'execute', reason: 'exit' },
      },
    });

    const ready = await setup.orchestrator.evaluateActiveVaults();

    expect(ready).toHaveLength(2);
    expect(ready.map((entry) => entry.vaultId)).toEqual([21n, 24n]);
    expect(ready.map((entry) => entry.strategyType)).toEqual(['yield-optimiser', 'exit']);
    expect(ready.map((entry) => entry.strategyId)).toEqual([1n, 4n]);
  });

  it('skips disabled strategies before evaluator invocation', async () => {
    const setup = createOrchestratorSetup({
      perTypeResult: {
        'yield-optimiser': { decision: 'wait', reason: 'wait' },
        rebalance: { decision: 'wait', reason: 'wait' },
        exit: { decision: 'wait', reason: 'wait' },
      },
    });

    await setup.orchestrator.evaluateActiveVaults();

    expect(setup.getEvaluator).toHaveBeenCalledTimes(3);
    expect(setup.getEvaluator).not.toHaveBeenCalledWith('dca');
    expect(setup.marketContextProvider.getMarketContext).toHaveBeenCalledTimes(3);
  });

  it('continues processing when an evaluator throws and excludes that vault', async () => {
    const setup = createOrchestratorSetup({
      perTypeResult: {
        'yield-optimiser': { decision: 'execute', reason: 'ok' },
        rebalance: { decision: 'execute', reason: 'ok' },
      },
      throwsForType: 'exit',
    });

    const ready = await setup.orchestrator.evaluateActiveVaults();

    expect(ready).toHaveLength(2);
    expect(ready.map((entry) => entry.vaultId)).toEqual([21n, 22n]);
  });

  it('selects evaluators using each strategy type from registry-linked configuration', async () => {
    const setup = createOrchestratorSetup();

    await setup.orchestrator.evaluateActiveVaults();

    expect(setup.getEvaluator).toHaveBeenCalledWith('yield-optimiser');
    expect(setup.getEvaluator).toHaveBeenCalledWith('rebalance');
    expect(setup.getEvaluator).toHaveBeenCalledWith('exit');
  });
});
