import { uintCV } from '@stacks/transactions';
import { z } from 'zod';

import { strategyEntrySchema, type BlockchainClient } from '../blockchain';

import type {
  DCAStrategyConfiguration,
  ExitStrategyConfiguration,
  RebalanceStrategyConfiguration,
  StrategyConfiguration,
  StrategyConfigurationRepository,
  StrategyType,
  YieldOptimiserStrategyConfiguration,
} from './index';
import type { AppLogger } from '../utils/logger';

const STRATEGY_TYPE_YIELD = 1n;
const STRATEGY_TYPE_REBALANCE = 2n;
const STRATEGY_TYPE_DCA = 3n;
const STRATEGY_TYPE_EXIT = 4n;

export interface OnChainStrategyConfigurationRepositoryOptions {
  client: BlockchainClient;
  strategyRegistryContractPrincipal: string;
  logger: AppLogger;
}

export class OnChainStrategyConfigurationRepository implements StrategyConfigurationRepository {
  constructor(private readonly options: OnChainStrategyConfigurationRepositoryOptions) {}

  async getStrategyConfiguration(strategyId: bigint): Promise<StrategyConfiguration> {
    this.options.logger.debug(
      {
        strategyId: strategyId.toString(),
      },
      'Fetching strategy configuration from on-chain registry'
    );

    const strategyEntry = await this.options.client.callReadOnlyFunction({
      contractAddress: this.options.strategyRegistryContractPrincipal,
      functionName: 'get-strategy-by-id',
      functionArgs: [uintCV(strategyId)],
      responseSchema: z.union([strategyEntrySchema, z.null()]),
    });

    if (!strategyEntry) {
      throw new Error(`Strategy ${strategyId.toString()} was not found`);
    }

    const strategyType = toStrategyType(strategyEntry['strategy-type']);

    switch (strategyType) {
      case 'yield-optimiser':
        return {
          strategyId,
          strategyType,
          enabled: strategyEntry.active,
          cooldownBlocks: 10,
          targetApyBps: 1200,
          requiredProtocols: [strategyEntry['target-protocol']],
        } satisfies YieldOptimiserStrategyConfiguration;
      case 'rebalance':
        return {
          strategyId,
          strategyType,
          enabled: strategyEntry.active,
          minRebalanceIntervalBlocks: 20,
          driftToleranceBps: 300,
          targetWeights: { portfolio: 1 },
          maxGasCostToBenefitRatio: 0.2,
        } satisfies RebalanceStrategyConfiguration;
      case 'dca':
        return {
          strategyId,
          strategyType,
          enabled: strategyEntry.active,
          dcaIntervalBlocks: 10,
          trancheAmount: 1n,
        } satisfies DCAStrategyConfiguration;
      case 'exit':
        return {
          strategyId,
          strategyType,
          enabled: strategyEntry.active,
          exitTriggers: [
            {
              type: 'manual-signal',
              signal: 'panic',
            },
          ],
        } satisfies ExitStrategyConfiguration;
      default:
        throw new Error(`Unsupported strategy type for ${strategyId.toString()}`);
    }
  }
}

function toStrategyType(rawType: bigint): StrategyType {
  if (rawType === STRATEGY_TYPE_YIELD) {
    return 'yield-optimiser';
  }

  if (rawType === STRATEGY_TYPE_REBALANCE) {
    return 'rebalance';
  }

  if (rawType === STRATEGY_TYPE_DCA) {
    return 'dca';
  }

  if (rawType === STRATEGY_TYPE_EXIT) {
    return 'exit';
  }

  throw new Error(`Unknown strategy type id: ${rawType.toString()}`);
}
