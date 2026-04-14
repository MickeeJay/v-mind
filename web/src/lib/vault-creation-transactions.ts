import { openContractCall } from '@stacks/connect';
import { ClarityType, hexToCV, principalCV, uintCV } from '@stacks/transactions';


import { getConnectNetwork, getExpectedNetwork } from '@/config/wallet';
import { env } from '@/lib/env';

import type { ConfirmedVaultResult, VaultCreationSubmissionResult } from '@/types/vault-creation';

const VAULT_CORE_CONTRACT = 'vault-core';

interface SubmitVaultCreationArgs {
  walletAddress: string;
  assetContractPrincipal: string;
  depositMicrostx: bigint;
  strategyId: bigint;
}

interface TransactionStatusResponse {
  tx_status?: string;
  tx_result?: {
    hex?: string;
    repr?: string;
  };
}

export class VaultTransactionError extends Error {
  readonly kind: 'wallet-rejection' | 'onchain-failure' | 'network-error';

  constructor(kind: VaultTransactionError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

function createWalletRejectionError(error?: unknown): VaultTransactionError {
  const message = error instanceof Error ? error.message : 'Transaction request was canceled in wallet.';
  return new VaultTransactionError('wallet-rejection', message);
}

function createNetworkError(message: string): VaultTransactionError {
  return new VaultTransactionError('network-error', message);
}

function createOnChainFailure(message: string): VaultTransactionError {
  return new VaultTransactionError('onchain-failure', message);
}

function isWalletRejection(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = Number(error.code);
    if (code === 4001) {
      return true;
    }
  }

  if (error instanceof Error) {
    return /cancel|reject|denied/i.test(error.message);
  }

  return false;
}

function getApiRoot(): string {
  return env.NEXT_PUBLIC_STACKS_API_URL.replace(/\/$/, '');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (!signal) {
      return;
    }

    if (signal.aborted) {
      clearTimeout(timeout);
      reject(createNetworkError('Transaction polling was canceled.'));
      return;
    }

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(createNetworkError('Transaction polling was canceled.'));
      },
      { once: true },
    );
  });
}

function extractVaultId(txResult?: TransactionStatusResponse['tx_result']): bigint | null {
  if (!txResult) {
    return null;
  }

  if (txResult.hex) {
    try {
      const decoded = hexToCV(txResult.hex);
      if (decoded.type === ClarityType.ResponseOk && decoded.value.type === ClarityType.UInt) {
        return decoded.value.value;
      }
    } catch {
      // Fallback to repr parsing below when hex is unavailable or malformed.
    }
  }

  if (!txResult.repr) {
    return null;
  }

  const match = txResult.repr.match(/\(ok\s+u(\d+)\)/i);
  if (!match) {
    return null;
  }

  const capturedVaultId = match[1];
  if (!capturedVaultId) {
    return null;
  }

  return BigInt(capturedVaultId);
}

function txStatusIsFailure(status: string): boolean {
  return status.startsWith('abort') || status.startsWith('dropped');
}

export function getExplorerTxUrl(txId: string): string {
  const chain = getExpectedNetwork() === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://explorer.hiro.so/txid/${txId}?chain=${chain}`;
}

export function getExplorerAddressUrl(address: string): string {
  const chain = getExpectedNetwork() === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://explorer.hiro.so/address/${address}?chain=${chain}`;
}

export async function submitVaultCreationTransaction(args: SubmitVaultCreationArgs): Promise<VaultCreationSubmissionResult> {
  const { walletAddress, assetContractPrincipal, depositMicrostx, strategyId } = args;

  return new Promise((resolve, reject) => {
    try {
      openContractCall({
        network: getConnectNetwork(),
        contractAddress: env.NEXT_PUBLIC_DEPLOYER_ADDRESS,
        contractName: VAULT_CORE_CONTRACT,
        functionName: 'create-vault',
        functionArgs: [principalCV(assetContractPrincipal), uintCV(depositMicrostx), uintCV(strategyId)],
        stxAddress: walletAddress,
        onFinish: (data: { txId: string }) => {
          if (!data.txId) {
            reject(createNetworkError('Wallet did not return a transaction ID.'));
            return;
          }

          resolve({ txId: data.txId });
        },
        onCancel: (error?: Error) => {
          reject(createWalletRejectionError(error));
        },
      });
    } catch (error) {
      if (isWalletRejection(error)) {
        reject(createWalletRejectionError(error));
        return;
      }

      reject(createNetworkError(error instanceof Error ? error.message : 'Unable to submit contract call.'));
    }
  });
}

interface PollConfirmationOptions {
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxAttempts?: number;
}

export async function pollVaultCreationConfirmation(
  txId: string,
  options?: PollConfirmationOptions,
): Promise<ConfirmedVaultResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? 5000;
  const maxAttempts = options?.maxAttempts ?? 90;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options?.signal?.aborted) {
      throw createNetworkError('Transaction polling was canceled.');
    }

    const response = await fetch(`${getApiRoot()}/extended/v1/tx/${txId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: options?.signal,
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'Network error while polling transaction status.';
      throw createNetworkError(`Attempt ${attempt + 1}/${maxAttempts}: ${reason}`);
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw createNetworkError(`Attempt ${attempt + 1}/${maxAttempts}: Stacks API unavailable (status ${response.status}).`);
      }

      await sleep(pollIntervalMs, options?.signal);
      continue;
    }

    const payload = (await response.json()) as TransactionStatusResponse;
    const txStatus = payload.tx_status?.toLowerCase() ?? 'unknown';

    if (txStatus === 'success') {
      return {
        txId,
        vaultId: extractVaultId(payload.tx_result),
      };
    }

    if (txStatusIsFailure(txStatus)) {
      const failureReason = payload.tx_result?.repr ?? txStatus;
      throw createOnChainFailure(`Transaction failed on-chain: ${failureReason}`);
    }

    await sleep(pollIntervalMs, options?.signal);
  }

  throw createNetworkError(`Timed out while waiting for transaction confirmation after ${maxAttempts} polling attempts.`);
}

export function classifyVaultTransactionError(error: unknown): VaultTransactionError {
  if (error instanceof VaultTransactionError) {
    return error;
  }

  if (isWalletRejection(error)) {
    return createWalletRejectionError(error);
  }

  return createNetworkError(error instanceof Error ? error.message : 'Unknown transaction error.');
}
