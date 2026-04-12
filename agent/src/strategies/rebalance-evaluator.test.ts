import { describe, expect, it } from 'vitest';
import { RebalanceEvaluator } from './rebalance-evaluator';
import type { RebalanceStrategyConfiguration, StrategyEvaluationInput } from './strategy-evaluator';

const strategy: RebalanceStrategyConfiguration = {
  strategyId: 2n,
  strategyType: 'rebalance',
  enabled: true,
  minRebalanceIntervalBlocks: 50,
  driftToleranceBps: 200,
  targetWeights: {
    zest: 0.5,
    alex: 0.5,
  },
  maxGasCostToBenefitRatio: 0.25,
};

function createInput(
  overrides: Partial<StrategyEvaluationInput<RebalanceStrategyConfiguration>> = {}
): StrategyEvaluationInput<RebalanceStrategyConfiguration> {
  return {
    vault: {
      vaultId: 12n,
      strategyId: 2n,
      currentBlock: 500,
      lastExecutionBlock: 420,
      currentWeights: {
        zest: 0.7,
        alex: 0.3,
      },
      uninvestedBalance: 10_000n,
    },
    strategy,
    market: {
      protocolHealth: {},
      assetPrices: {},
      estimatedGasCost: 20,
      estimatedRebalanceBenefit: 100,
    },
    ...overrides,
  };
}

describe('RebalanceEvaluator', () => {
  const evaluator = new RebalanceEvaluator();

  it('returns execute when drift, interval, and gas-benefit checks pass', () => {
    const result = evaluator.evaluate(createInput());
    expect(result.decision).toBe('execute');
  });

  it('returns wait when allocation drift is within tolerance', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          currentWeights: {
            zest: 0.51,
            alex: 0.49,
          },
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('within tolerance');
  });

  it('returns wait when allocation drift is exactly at tolerance boundary', () => {
    const result = evaluator.evaluate(
      createInput({
        strategy: {
          ...strategy,
          driftToleranceBps: 2_000,
        },
      })
    );

    expect(result.decision).toBe('wait');
  });

  it('returns wait when minimum rebalance interval has not elapsed', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          lastExecutionBlock: 470,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('Minimum rebalance interval active');
  });

  it('returns wait when gas cost is disproportionate to benefit', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {},
          assetPrices: {},
          estimatedGasCost: 40,
          estimatedRebalanceBenefit: 100,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('gas-to-benefit ratio');
  });

  it('returns error when current weights are missing', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          currentWeights: undefined,
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing current allocation weights');
  });

  it('returns error when estimated gas cost is missing', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          ...createInput().market,
          estimatedGasCost: undefined,
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing estimated gas cost');
  });

  it('returns error when estimated rebalance benefit is missing', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          ...createInput().market,
          estimatedRebalanceBenefit: undefined,
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing estimated rebalance benefit');
  });

  it('returns wait when estimated rebalance benefit is non-positive', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          ...createInput().market,
          estimatedRebalanceBenefit: 0,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('not positive');
  });

  it('returns execute when there is no prior execution history', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          lastExecutionBlock: null,
        },
      })
    );

    expect(result.decision).toBe('execute');
  });
});