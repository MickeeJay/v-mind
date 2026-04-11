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
import { parseContractIdentifier, type ContractReference } from './contracts';

export interface VaultReaderOptions {
  contractAddress?: string;
  contractName?: string;
  contractIdentifier?: string;
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
  private readonly contractRef: ContractReference;

  constructor(
    private readonly client: StacksClient,
    options: VaultReaderOptions,
    private readonly logger: AppLogger
  ) {
    this.contractRef = resolveContractReference(options);
  }

  async getVaultState(vaultId: bigint): Promise<VaultState> {
    try {
      const vaultEntry = await this.client.callReadOnlyFunction({
        contractAddress: this.contractRef.address,
        contractName: this.contractRef.name,
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
      contractAddress: this.contractRef.address,
      contractName: this.contractRef.name,
      functionName,
      functionArgs: [uintCV(vaultId)],
      responseSchema: vaultUintResponseSchema,
    });

    return response.value;
  }
}

function resolveContractReference(options: VaultReaderOptions): ContractReference {
  if (options.contractIdentifier) {
    return parseContractIdentifier(options.contractIdentifier);
  }

  if (!options.contractAddress || !options.contractName) {
    throw new Error('VaultReader requires either contractIdentifier or both contractAddress and contractName');
  }

  return {
    address: options.contractAddress,
    name: options.contractName,
  };
}
