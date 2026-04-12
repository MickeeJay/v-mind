import {
  blocksSinceLastExecution,
  toExecute,
  toWait,
  type DCAStrategyConfiguration,
  type StrategyEvaluationInput,
  type StrategyEvaluationResult,
  type StrategyEvaluator,
} from './strategy-evaluator';

export class DCAEvaluator implements StrategyEvaluator<DCAStrategyConfiguration> {
  evaluate(input: StrategyEvaluationInput<DCAStrategyConfiguration>): StrategyEvaluationResult {
    const { vault, strategy } = input;

    const blocksSinceExecution = blocksSinceLastExecution(vault.currentBlock, vault.lastExecutionBlock);
    if (blocksSinceExecution !== null && blocksSinceExecution < strategy.dcaIntervalBlocks) {
      return toWait(`DCA interval active (${blocksSinceExecution}/${strategy.dcaIntervalBlocks} blocks)`);
    }

    if (vault.uninvestedBalance < strategy.trancheAmount) {
      return toWait(
        `Insufficient uninvested balance (${vault.uninvestedBalance.toString()}) for next DCA tranche (${strategy.trancheAmount.toString()})`
      );
    }

    return toExecute('DCA conditions met');
  }
}