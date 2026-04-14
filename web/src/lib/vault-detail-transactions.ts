import { openContractCall } from '@stacks/connect';
import { principalCV, uintCV, type ClarityValue } from '@stacks/transactions';

import { getConnectNetwork, getExpectedNetwork } from '@/config/wallet';
import { env } from '@/lib/env';
import { classifyVaultTransactionError, getExplorerTxUrl, pollVaultCreationConfirmation } from '@/lib/vault-creation-transactions';

const VAULT_CORE_CONTRACT = 'vault-core';
const VAULT_RECEIPT_TOKEN_CONTRACT = 'vault-receipt-token';

export class VaultActionTransactionError extends Error {
  readonly kind: 'wallet-rejection' | 'onchain-failure' | 'network-error';

  constructor(kind: VaultActionTransactionError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export function getVaultContractPrincipal(): string {
  return `${env.NEXT_PUBLIC_DEPLOYER_ADDRESS}.${VAULT_CORE_CONTRACT}`;
}

export function getVaultReceiptTokenPrincipal(): string {
  return `${env.NEXT_PUBLIC_DEPLOYER_ADDRESS}.${VAULT_RECEIPT_TOKEN_CONTRACT}`;
}

export function getExplorerContractUrl(contractPrincipal: string): string {
  const chain = getExpectedNetwork() === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://explorer.hiro.so/address/${contractPrincipal}?chain=${chain}`;
}

export async function submitVaultActionTransaction(args: {
  walletAddress: string;
  functionName: string;
  functionArgs: ClarityValue[];
}): Promise<{ txId: string }> {
  const { walletAddress, functionName, functionArgs } = args;

  return new Promise((resolve, reject) => {
    try {
      openContractCall({
        network: getConnectNetwork(),
        contractAddress: env.NEXT_PUBLIC_DEPLOYER_ADDRESS,
        contractName: VAULT_CORE_CONTRACT,
        functionName,
        functionArgs,
        stxAddress: walletAddress,
        onFinish: (data: { txId: string }) => {
          if (!data.txId) {
            reject(new VaultActionTransactionError('network-error', 'Wallet did not return a transaction ID.'));
            return;
          }

          resolve({ txId: data.txId });
        },
        onCancel: (error?: Error) => {
          const classified = classifyVaultTransactionError(error);
          reject(new VaultActionTransactionError(classified.kind, classified.message));
        },
      });
    } catch (error) {
      const classified = classifyVaultTransactionError(error);
      reject(new VaultActionTransactionError(classified.kind, classified.message));
    }
  });
}

export async function pollVaultActionConfirmation(txId: string, options?: { signal?: AbortSignal }): Promise<void> {
  await pollVaultCreationConfirmation(txId, options);
}

export function buildVaultActionTxUrl(txId: string): string {
  return getExplorerTxUrl(txId);
}

export function buildDepositArgs(vaultId: bigint, assetPrincipal: string, amountMicrostx: bigint): ClarityValue[] {
  return [uintCV(vaultId), principalCV(assetPrincipal), uintCV(amountMicrostx)];
}

export function buildWithdrawArgs(vaultId: bigint, shareAmount: bigint): ClarityValue[] {
  return [uintCV(vaultId), uintCV(shareAmount)];
}

export function buildVaultIdArgs(vaultId: bigint): ClarityValue[] {
  return [uintCV(vaultId)];
}
