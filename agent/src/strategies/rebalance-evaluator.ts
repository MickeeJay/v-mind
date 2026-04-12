import {
  blocksSinceLastExecution,
  toError,
  toExecute,
  toWait,
  type RebalanceStrategyConfiguration,
  type StrategyEvaluationInput,
  type StrategyEvaluationResult,
  type StrategyEvaluator,
} from './strategy-evaluator';

export class RebalanceEvaluator implements StrategyEvaluator<RebalanceStrategyConfiguration> {
  evaluate(input: StrategyEvaluationInput<RebalanceStrategyConfiguration>): StrategyEvaluationResult {
    const { vault, strategy, market } = input;

    const currentWeights = vault.currentWeights;
    if (!currentWeights) {
      return toError('Missing current allocation weights for rebalance evaluation');
    }

    const maxDriftBps = calculateMaxDriftBps(currentWeights, strategy.targetWeights);
    if (maxDriftBps <= strategy.driftToleranceBps) {
      return toWait(
        `Allocation drift (${maxDriftBps.toFixed(2)} bps) is within tolerance (${strategy.driftToleranceBps} bps)`
      );
    }

    const blocksSinceExecution = blocksSinceLastExecution(vault.currentBlock, vault.lastExecutionBlock);
    if (blocksSinceExecution !== null && blocksSinceExecution < strategy.minRebalanceIntervalBlocks) {
      return toWait(
        `Minimum rebalance interval active (${blocksSinceExecution}/${strategy.minRebalanceIntervalBlocks} blocks)`
      );
    }

    if (typeof market.estimatedGasCost !== 'number') {
      return toError('Missing estimated gas cost for rebalance evaluation');
    }

    if (typeof market.estimatedRebalanceBenefit !== 'number') {
      return toError('Missing estimated rebalance benefit for rebalance evaluation');
    }

    if (market.estimatedRebalanceBenefit <= 0) {
      return toWait('Estimated rebalance benefit is not positive');
    }

    const ratio = market.estimatedGasCost / market.estimatedRebalanceBenefit;
    if (ratio > strategy.maxGasCostToBenefitRatio) {
      return toWait(
        `Estimated gas-to-benefit ratio (${ratio.toFixed(4)}) exceeds max (${strategy.maxGasCostToBenefitRatio.toFixed(4)})`
      );
    }

    return toExecute('Rebalance conditions met');
  }
}

function calculateMaxDriftBps(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>
): number {
  const assets = new Set<string>([...Object.keys(targetWeights), ...Object.keys(currentWeights)]);
  let maxDrift = 0;

  for (const asset of assets) {
    const current = currentWeights[asset] ?? 0;
    const target = targetWeights[asset] ?? 0;
    const drift = Math.abs(current - target);
    if (drift > maxDrift) {
      maxDrift = drift;
    }
  }

  return maxDrift * 10_000;
}