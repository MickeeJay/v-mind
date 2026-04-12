import { describe, expect, it } from 'vitest';
import { ExitEvaluator } from './exit-evaluator';
import type { ExitStrategyConfiguration, StrategyEvaluationInput } from './strategy-evaluator';

const strategy: ExitStrategyConfiguration = {
  strategyId: 4n,
  strategyType: 'exit',
  enabled: true,
  exitTriggers: [
    {
      type: 'price-below',
      asset: 'stx',
      threshold: 1.25,
    },
    {
      type: 'manual-signal',
      signal: 'kill-switch',
    },
  ],
};

function createInput(
  overrides: Partial<StrategyEvaluationInput<ExitStrategyConfiguration>> = {}
): StrategyEvaluationInput<ExitStrategyConfiguration> {
  return {
    vault: {
      vaultId: 14n,
      strategyId: 4n,
      currentBlock: 1000,
      lastExecutionBlock: 999,
      uninvestedBalance: 0n,
    },
    strategy,
    market: {
      protocolHealth: {},
      assetPrices: {
        stx: 1.0,
      },
      triggeredExitSignals: [],
    },
    ...overrides,
  };
}

describe('ExitEvaluator', () => {
  const evaluator = new ExitEvaluator();

  it('returns execute immediately when price-below trigger is activated', () => {
    const result = evaluator.evaluate(createInput());
    expect(result.decision).toBe('execute');
    expect(result.reason).toContain('Exit trigger met');
  });

  it('returns execute when manual signal is activated', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {},
          assetPrices: {
            stx: 1.5,
          },
          triggeredExitSignals: ['kill-switch'],
        },
      })
    );

    expect(result.decision).toBe('execute');
    expect(result.reason).toContain('Exit signal triggered');
  });

  it('returns wait when no exit trigger is active', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {},
          assetPrices: {
            stx: 1.5,
          },
          triggeredExitSignals: [],
        },
      })
    );

    expect(result.decision).toBe('wait');
    expect(result.reason).toContain('No exit triggers');
  });

  it('returns error when required price feed is missing', () => {
    const result = evaluator.evaluate(
      createInput({
        market: {
          protocolHealth: {},
          assetPrices: {},
          triggeredExitSignals: [],
        },
      })
    );

    expect(result.decision).toBe('error');
    expect(result.reason).toContain('Missing price');
  });

  it('returns execute even with no execution history when trigger is active', () => {
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