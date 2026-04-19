import { describe, expect, it } from 'vitest';

import { YieldOptimiserEvaluator } from './yield-optimiser-evaluator';

import type { StrategyEvaluationInput, YieldOptimiserStrategyConfiguration } from './strategy-evaluator';

const strategy: YieldOptimiserStrategyConfiguration = {
  strategyId: 1n,
  strategyType: 'yield-optimiser',
  enabled: true,
  cooldownBlocks: 20,
  targetApyBps: 1_200,
  requiredProtocols: ['zest', 'alex'],
};

function createInput(
  overrides: Partial<StrategyEvaluationInput<YieldOptimiserStrategyConfiguration>> = {}
): StrategyEvaluationInput<YieldOptimiserStrategyConfiguration> {
  return {
    vault: {
      vaultId: 11n,
      strategyId: 1n,
      currentBlock: 200,
      lastExecutionBlock: 170,
      currentApyBps: 900,
      uninvestedBalance: 1_000_000n,
    },
    strategy,
    market: {
      protocolHealth: {
        zest: { healthy: true },
        alex: { healthy: true },
      },
      assetPrices: {},
    },
    ...overrides,
  };
}

describe('YieldOptimiserEvaluator', () => {
  const evaluator = new YieldOptimiserEvaluator();

  it('returns execute when cooldown elapsed, yield is below target, and protocols are healthy', () => {
    const result = evaluator.evaluate(createInput());
    expect(result.decision).toBe('execute');
  });

  it('returns wait when cooldown has not elapsed', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          lastExecutionBlock: 190,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('Cooldown active');
  });

  it('returns execute when cooldown has exactly elapsed', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          lastExecutionBlock: 180,
        },
      })
    );

    expect(result.decision).toBe('execute');
  });

  it('returns wait when current APY is not below target', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          currentApyBps: 1_300,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('at or above target');
  });

  it('returns wait when current APY is exactly at target', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          currentApyBps: strategy.targetApyBps,
        },
      })
    );

    expect(result.decision).toBe('wait');
  });

  it('returns wait when any required protocol is unhealthy', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {
            zest: { healthy: true },
            alex: { healthy: false, reason: 'maintenance' },
          },
          assetPrices: {},
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('unhealthy');
  });

  it('returns error when current APY is missing', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          currentApyBps: undefined,
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing current APY');
  });

  it('returns error when a required protocol health signal is missing', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {
            zest: { healthy: true },
          },
          assetPrices: {},
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing health signal');
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