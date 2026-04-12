import {
  toError,
  toExecute,
  toWait,
  type ExitStrategyConfiguration,
  type StrategyEvaluationInput,
  type StrategyEvaluationResult,
  type StrategyEvaluator,
} from './strategy-evaluator';

export class ExitEvaluator implements StrategyEvaluator<ExitStrategyConfiguration> {
  evaluate(input: StrategyEvaluationInput<ExitStrategyConfiguration>): StrategyEvaluationResult {
    const { strategy, market } = input;
    const signals = new Set(market.triggeredExitSignals ?? []);

    for (const trigger of strategy.exitTriggers) {
      if (trigger.type === 'manual-signal' && signals.has(trigger.signal)) {
        return toExecute(`Exit signal triggered: ${trigger.signal}`);
      }

      if (trigger.type === 'price-below') {
        const currentPrice = market.assetPrices[trigger.asset];
        if (typeof currentPrice !== 'number') {
          return toError(`Missing price for exit trigger asset ${trigger.asset}`);
        }

        if (currentPrice < trigger.threshold) {
          return toExecute(
            `Exit trigger met: ${trigger.asset} price ${currentPrice} below threshold ${trigger.threshold}`
          );
        }
      }
    }

    return toWait('No exit triggers have been activated');
  }
}