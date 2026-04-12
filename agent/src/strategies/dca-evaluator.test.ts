import { describe, expect, it } from 'vitest';
import { DCAEvaluator } from './dca-evaluator';
import type { DCAStrategyConfiguration, StrategyEvaluationInput } from './strategy-evaluator';

const strategy: DCAStrategyConfiguration = {
  strategyId: 3n,
  strategyType: 'dca',
  enabled: true,
  dcaIntervalBlocks: 12,
  trancheAmount: 250n,
};

function createInput(
  overrides: Partial<StrategyEvaluationInput<DCAStrategyConfiguration>> = {}
): StrategyEvaluationInput<DCAStrategyConfiguration> {
  return {
    vault: {
      vaultId: 13n,
      strategyId: 3n,
      currentBlock: 100,
      lastExecutionBlock: 80,
      uninvestedBalance: 1_000n,
    },
    strategy,
    market: {
      protocolHealth: {},
      assetPrices: {},
    },
    ...overrides,
  };
}

describe('DCAEvaluator', () => {
  const evaluator = new DCAEvaluator();

  it('returns execute when interval elapsed and tranche balance is available', () => {
    const result = evaluator.evaluate(createInput());
    expect(result.decision).toBe('execute');
  });

  it('returns wait when interval has not elapsed', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          lastExecutionBlock: 95,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('DCA interval active');
  });

  it('returns wait when uninvested balance is below tranche amount', () => {
    const result = evaluator.evaluate(
      createInput({
        vault: {
          ...createInput().vault,
          uninvestedBalance: 200n,
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('Insufficient uninvested balance');
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