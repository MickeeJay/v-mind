import {
  Configuration,
  InfoApi,
  type ConfigurationParameters,
} from '@stacks/blockchain-api-client';
import {
  StacksMainnet,
  StacksMocknet,
  StacksNetwork,
  StacksTestnet,
} from '@stacks/network';
import pRetry from 'p-retry';
import { z } from 'zod';
import type { AgentConfig } from '../config';
import type { AppLogger } from '../utils/logger';

export interface ChainTip {
  blockHeight: number;
  blockHash?: string;
  burnBlockHeight?: number;
}

export interface BlockchainClient {
  getChainTip(): Promise<ChainTip>;
}

const chainTipSchema = z.object({
  stacks_tip_height: z.number().int().nonnegative(),
  stacks_tip: z.string().optional(),
  burn_block_height: z.number().int().nonnegative().optional(),
});

export class StacksApiBlockchainClient implements BlockchainClient {
  private readonly infoApi: InfoApi;

  constructor(
    private readonly config: Pick<AgentConfig, 'stacks' | 'retry'>,
    private readonly logger: AppLogger
  ) {
    const configurationOptions: ConfigurationParameters = {
      basePath: this.config.stacks.apiBaseUrl,
    };

    if (this.config.stacks.hiroApiKey) {
      configurationOptions.headers = {
        'x-api-key': this.config.stacks.hiroApiKey,
      };
    }

    this.infoApi = new InfoApi(new Configuration(configurationOptions));
  }

  async getChainTip(): Promise<ChainTip> {
    return pRetry(
      async () => {
        const response = await this.infoApi.getCoreApiInfo();
        const parsed = chainTipSchema.parse(response);

        return {
          blockHeight: parsed.stacks_tip_height,
          blockHash: parsed.stacks_tip,
          burnBlockHeight: parsed.burn_block_height,
        };
      },
      {
        retries: this.config.retry.attempts - 1,
        minTimeout: this.config.retry.minTimeoutMs,
        maxTimeout: this.config.retry.maxTimeoutMs,
        onFailedAttempt: (error) => {
          this.logger.warn(
            {
              attemptNumber: error.attemptNumber,
              retriesLeft: error.retriesLeft,
              message: error.message,
            },
            'Failed to fetch chain tip, retrying'
          );
        },
      }
    );
  }
}

export function createStacksNetwork(network: AgentConfig['stacks']['network'], apiBaseUrl: string): StacksNetwork {
  switch (network) {
    case 'mainnet':
      return new StacksMainnet({ url: apiBaseUrl });
    case 'devnet':
      return new StacksMocknet({ url: apiBaseUrl });
    default:
      return new StacksTestnet({ url: apiBaseUrl });
  }
}