import { describe, expect, it } from 'vitest';
import { DefaultStrategyEvaluatorFactory } from './evaluation-orchestrator';

describe('DefaultStrategyEvaluatorFactory', () => {
  it('returns a concrete evaluator for each strategy type', () => {
    const factory = new DefaultStrategyEvaluatorFactory();

    expect(factory.getEvaluator('yield-optimiser')).toBeDefined();
    expect(factory.getEvaluator('rebalance')).toBeDefined();
    expect(factory.getEvaluator('dca')).toBeDefined();
    expect(factory.getEvaluator('exit')).toBeDefined();
  });

  it('applies overrides for a specific strategy type', () => {
    const customEvaluator = {
      evaluate: () => ({ decision: 'wait' as const, reason: 'custom' }),
    };

    const factory = new DefaultStrategyEvaluatorFactory({
      dca: customEvaluator,
    });

    expect(factory.getEvaluator('dca')).toBe(customEvaluator);
  });
});
