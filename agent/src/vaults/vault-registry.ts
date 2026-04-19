import { uintCV } from '@stacks/transactions';
import { z } from 'zod';

import { clarityOkResponseSchema } from '../blockchain';

import type { BlockchainClient } from '../blockchain';
import type { OnChainVaultRegistry, VaultEvaluationState } from '../strategies';
import type { AppLogger } from '../utils/logger';

const ACTIVE_VAULT_STATUS = 1n;

export interface StacksVaultRegistryOptions {
  client: BlockchainClient;
  vaultCoreContractPrincipal: string;
  logger: AppLogger;
}

export class StacksVaultRegistry implements OnChainVaultRegistry {
  constructor(private readonly options: StacksVaultRegistryOptions) {}

  async listActiveVaults(): Promise<VaultEvaluationState[]> {
    const [currentBlockHeight, nextVaultId] = await Promise.all([
      this.options.client.getCurrentBlockHeight(),
      this.options.client.callReadOnlyFunction({
        contractAddress: this.options.vaultCoreContractPrincipal,
        functionName: 'get-next-vault-id',
        functionArgs: [],
        responseSchema: z.bigint().nonnegative(),
      }),
    ]);

    const activeVaults: VaultEvaluationState[] = [];

    for (let vaultId = 1n; vaultId < nextVaultId; vaultId += 1n) {
      try {
        const [status, strategyId, lastExecutionBlock, totalAssets] = await Promise.all([
          this.readOkUint('get-vault-status', vaultId),
          this.readOkUint('get-vault-strategy-id', vaultId),
          this.readOkUint('get-vault-last-execution-block', vaultId),
          this.readOkUint('get-vault-total-assets', vaultId),
        ]);

        if (status !== ACTIVE_VAULT_STATUS) {
          continue;
        }

        activeVaults.push({
          vaultId,
          strategyId,
          currentBlock: currentBlockHeight,
          lastExecutionBlock: asOptionalBlockNumber(lastExecutionBlock),
          currentApyBps: 0,
          currentWeights: { portfolio: 1 },
          uninvestedBalance: totalAssets,
        });
      } catch (error) {
        this.options.logger.warn(
          {
            vaultId: vaultId.toString(),
            err: error,
          },
          'Skipping vault during active-vault scan due to read failure'
        );
      }
    }

    return activeVaults;
  }

  private async readOkUint(functionName: string, vaultId: bigint): Promise<bigint> {
    const response = await this.options.client.callReadOnlyFunction({
      contractAddress: this.options.vaultCoreContractPrincipal,
      functionName,
      functionArgs: [uintCV(vaultId)],
      responseSchema: clarityOkResponseSchema(z.bigint().nonnegative()),
    });

    return response.value;
  }
}

function asOptionalBlockNumber(value: bigint): number | null {
  if (value <= 0n) {
    return null;
  }

  return Number(value);
}