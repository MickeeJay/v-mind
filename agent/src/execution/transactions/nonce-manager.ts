import type { TransactionNodeClient } from './stacks-node-client';
import type { AppLogger } from '../../utils/logger';

export class NonceManager {
  private nextNonce: bigint | undefined;
  private currentAddress: string | undefined;
  private readonly pendingByTxId = new Map<string, bigint>();

  constructor(
    private readonly nodeClient: TransactionNodeClient,
    private readonly logger: AppLogger
  ) {}

  async allocateNonce(address: string): Promise<bigint> {
    if (!this.nextNonce || this.currentAddress !== address) {
      await this.resetFromChain(address);
    }

    let nonce = this.nextNonce ?? 0n;
    const highestPendingNonce = this.getHighestPendingNonce();
    if (typeof highestPendingNonce !== 'undefined') {
      nonce = maxBigInt(nonce, highestPendingNonce + 1n);
    }

    this.nextNonce = nonce + 1n;

    this.logger.debug(
      {
        address,
        allocatedNonce: nonce.toString(),
      },
      'Allocated nonce for transaction submission'
    );

    return nonce;
  }

  markPending(txId: string, nonce: bigint): void {
    this.pendingByTxId.set(txId, nonce);
  }

  markConfirmed(txId: string): void {
    this.pendingByTxId.delete(txId);
  }

  markFailed(txId: string, retryable: boolean): void {
    this.pendingByTxId.delete(txId);

    if (retryable) {
      this.nextNonce = undefined;
      this.logger.warn(
        {
          txId,
        },
        'Retryable transaction failure detected; nonce manager will resync from chain'
      );
    }
  }

  async resetFromChain(address: string): Promise<void> {
    const nonceState = await this.nodeClient.getAddressNonces(address);

    this.currentAddress = address;
    this.nextNonce = maxBigInt(nonceState.nonce, nonceState.possibleNextNonce);

    this.logger.info(
      {
        address,
        nonce: nonceState.nonce.toString(),
        possibleNextNonce: nonceState.possibleNextNonce.toString(),
      },
      'Nonce manager synchronized from on-chain state'
    );
  }

  private getHighestPendingNonce(): bigint | undefined {
    let highest: bigint | undefined;

    for (const nonce of this.pendingByTxId.values()) {
      if (typeof highest === 'undefined' || nonce > highest) {
        highest = nonce;
      }
    }

    return highest;
  }
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
