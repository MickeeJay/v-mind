import {
  blocksSinceLastExecution,
  toError,
  toExecute,
  toWait,
  type StrategyEvaluationInput,
  type StrategyEvaluationResult,
  type StrategyEvaluator,
  type YieldOptimiserStrategyConfiguration,
} from './strategy-evaluator';

export class YieldOptimiserEvaluator implements StrategyEvaluator<YieldOptimiserStrategyConfiguration> {
  evaluate(
    input: StrategyEvaluationInput<YieldOptimiserStrategyConfiguration>
  ): StrategyEvaluationResult {
    const { vault, strategy, market } = input;

    const blocksSinceExecution = blocksSinceLastExecution(vault.currentBlock, vault.lastExecutionBlock);
    if (blocksSinceExecution !== null && blocksSinceExecution < strategy.cooldownBlocks) {
      return toWait(
        `Cooldown active (${blocksSinceExecution}/${strategy.cooldownBlocks} blocks since last execution)`
      );
    }

    if (typeof vault.currentApyBps !== 'number') {
      return toError('Missing current APY for yield optimiser evaluation', ['vault.currentApyBps is undefined']);
    }

    if (vault.currentApyBps >= strategy.targetApyBps) {
      return toWait(
        `Current APY (${vault.currentApyBps} bps) is at or above target threshold (${strategy.targetApyBps} bps)`
      );
    }

    for (const protocol of strategy.requiredProtocols) {
      const status = market.protocolHealth[protocol];
      if (!status) {
        return toError(`Missing health signal for required protocol ${protocol}`, [protocol]);
      }

      if (!status.healthy) {
        const reason = status.reason ?? 'Protocol reported unhealthy state';
        return toWait(`Protocol ${protocol} is unhealthy: ${reason}`);
      }
    }

    return toExecute('Yield optimiser conditions met');
  }
}