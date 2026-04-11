import { uintCV } from '@stacks/transactions';
import { z } from 'zod';
import type { AppLogger } from '../utils/logger';
import {
  clarityListSchema,
  clarityUintSchema,
  strategyConfigurationSchema,
  strategyEntrySchema,
  type StrategyConfiguration,
} from './schemas';
import type { StacksClient } from './stacks-client';
import { parseContractIdentifier, type ContractReference } from './contracts';

export interface StrategyReaderOptions {
  contractAddress?: string;
  contractName?: string;
  contractIdentifier?: string;
}

const optionalStrategySchema = z.union([strategyEntrySchema, z.null()]);
const strategyIdListSchema = clarityListSchema(clarityUintSchema);

export class StrategyReaderError extends Error {
  constructor(message: string, public readonly causeValue?: unknown) {
    super(message);
    this.name = 'StrategyReaderError';
  }
}

export class StrategyReader {
  private readonly contractRef: ContractReference;

  constructor(
    private readonly client: StacksClient,
    options: StrategyReaderOptions,
    private readonly logger: AppLogger
  ) {
    this.contractRef = resolveContractReference(options);
  }

  async getStrategyConfiguration(strategyId: bigint): Promise<StrategyConfiguration> {
    try {
      const strategyEntry = await this.client.callReadOnlyFunction({
        contractAddress: this.contractRef.address,
        contractName: this.contractRef.name,
        functionName: 'get-strategy-by-id',
        functionArgs: [uintCV(strategyId)],
        responseSchema: optionalStrategySchema,
      });

      if (!strategyEntry) {
        throw new StrategyReaderError(`Strategy ${strategyId.toString()} was not found`);
      }

      return strategyConfigurationSchema.parse({
        strategyId,
        active: strategyEntry.active,
        parameters: {
          name: strategyEntry['strategy-name'],
          strategyType: strategyEntry['strategy-type'],
          targetProtocol: strategyEntry['target-protocol'],
          riskTier: strategyEntry['risk-tier'],
          authorizedExecutor: strategyEntry['authorized-executor'],
          createdAtBlock: strategyEntry['created-at-block'],
          updatedAtBlock: strategyEntry['last-updated-block'],
        },
      });
    } catch (error) {
      this.logger.error({ err: error, strategyId: strategyId.toString() }, 'Failed to read strategy configuration');
      if (error instanceof StrategyReaderError) {
        throw error;
      }

      throw new StrategyReaderError(`Failed to read strategy ${strategyId.toString()} configuration`, error);
    }
  }

  async listStrategiesByType(strategyType: bigint): Promise<StrategyConfiguration[]> {
    const strategyIds = await this.client.callReadOnlyFunction({
      contractAddress: this.contractRef.address,
      contractName: this.contractRef.name,
      functionName: 'list-strategies-by-type',
      functionArgs: [uintCV(strategyType)],
      responseSchema: strategyIdListSchema,
    });

    const configurations = await Promise.all(strategyIds.map((strategyId) => this.getStrategyConfiguration(strategyId)));
    return configurations.filter((configuration) => configuration.active);
  }

  async listActiveStrategies(): Promise<StrategyConfiguration[]> {
    const total = await this.client.callReadOnlyFunction({
      contractAddress: this.contractRef.address,
      contractName: this.contractRef.name,
      functionName: 'get-total-strategies',
      functionArgs: [],
      responseSchema: clarityUintSchema,
    });

    const active: StrategyConfiguration[] = [];
    let strategyId = 1n;

    while (strategyId <= total) {
      const configuration = await this.getStrategyConfiguration(strategyId);
      if (configuration.active) {
        active.push(configuration);
      }

      strategyId += 1n;
    }

    return active;
  }
}

function resolveContractReference(options: StrategyReaderOptions): ContractReference {
  if (options.contractIdentifier) {
    return parseContractIdentifier(options.contractIdentifier);
  }

  if (!options.contractAddress || !options.contractName) {
    throw new Error('StrategyReader requires either contractIdentifier or both contractAddress and contractName');
  }

  return {
    address: options.contractAddress,
    name: options.contractName,
  };
}
