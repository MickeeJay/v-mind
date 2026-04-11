import { uintCV } from '@stacks/transactions';
import { z } from 'zod';
import type { AppLogger } from '../utils/logger';
import {
  clarityOkResponseSchema,
  vaultEntrySchema,
  vaultStateSchema,
  type VaultState,
} from './schemas';
import type { StacksClient } from './stacks-client';

export interface VaultReaderOptions {
  contractAddress: string;
  contractName?: string;
}

const optionalVaultEntrySchema = z.union([vaultEntrySchema, z.null()]);
const vaultUintResponseSchema = clarityOkResponseSchema(z.bigint().nonnegative());

export class VaultReaderError extends Error {
  constructor(message: string, public readonly causeValue?: unknown) {
    super(message);
    this.name = 'VaultReaderError';
  }
}

export class VaultReader {
  constructor(
    private readonly client: StacksClient,
    private readonly options: VaultReaderOptions,
    private readonly logger: AppLogger
  ) {}

  async getVaultState(vaultId: bigint): Promise<VaultState> {
    try {
      const vaultEntry = await this.client.callReadOnlyFunction({
        contractAddress: this.options.contractAddress,
        contractName: this.options.contractName,
        functionName: 'get-vault',
        functionArgs: [uintCV(vaultId)],
        responseSchema: optionalVaultEntrySchema,
      });

      if (!vaultEntry) {
        throw new VaultReaderError(`Vault ${vaultId.toString()} was not found`);
      }

      const balance = await this.readOkUint('get-vault-total-assets', vaultId);
      const strategyId = await this.readOkUint('get-vault-strategy-id', vaultId);
      const lastExecutionBlock = await this.readOkUint('get-vault-last-execution-block', vaultId);
      const status = await this.readOkUint('get-vault-status', vaultId);

      return vaultStateSchema.parse({
        vaultId,
        metadata: {
          owner: vaultEntry['vault-owner'],
          assetContract: vaultEntry['asset-contract'],
          createdAtBlock: vaultEntry['created-at-block'],
        },
        currentBalance: balance,
        assignedStrategy: strategyId,
        lastExecutionBlock,
        status,
        executionLocked: vaultEntry['execution-locked'],
      });
    } catch (error) {
      this.logger.error({ err: error, vaultId: vaultId.toString() }, 'Failed to read vault state');
      if (error instanceof VaultReaderError) {
        throw error;
      }

      throw new VaultReaderError(`Failed to read vault ${vaultId.toString()} state`, error);
    }
  }

  private async readOkUint(functionName: string, vaultId: bigint): Promise<bigint> {
    const response = await this.client.callReadOnlyFunction({
      contractAddress: this.options.contractAddress,
      contractName: this.options.contractName,
      functionName,
      functionArgs: [uintCV(vaultId)],
      responseSchema: vaultUintResponseSchema,
    });

    return response.value;
  }
}
