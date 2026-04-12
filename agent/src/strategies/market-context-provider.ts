import type {
  MarketContext,
  StrategyConfiguration,
  VaultEvaluationState,
} from './strategy-evaluator';
import type { MarketContextProvider } from './evaluation-orchestrator';

export class StaticMarketContextProvider implements MarketContextProvider {
  async getMarketContext(
    _vault: VaultEvaluationState,
    strategy: StrategyConfiguration
  ): Promise<MarketContext> {
    const protocolHealth: MarketContext['protocolHealth'] = {
      zest: { healthy: true },
      alex: { healthy: true },
      stackingdao: { healthy: true },
      hermetica: { healthy: true },
    };

    if (strategy.strategyType === 'yield-optimiser') {
      for (const protocol of strategy.requiredProtocols) {
        protocolHealth[protocol] = { healthy: true };
      }
    }

    const assetPrices: Record<string, number> = {};
    if (strategy.strategyType === 'exit') {
      for (const trigger of strategy.exitTriggers) {
        if (trigger.type === 'price-below') {
          assetPrices[trigger.asset] = Number.MAX_SAFE_INTEGER;
        }
      }
    }

    return {
      protocolHealth,
      assetPrices,
      estimatedGasCost: 1,
      estimatedRebalanceBenefit: 10,
      triggeredExitSignals: [],
    };
  }
}
