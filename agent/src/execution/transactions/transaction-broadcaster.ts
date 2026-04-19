import type { PendingTransactionStore } from './pending-transaction-store';
import type { TransactionNodeClient } from './stacks-node-client';
import type { BroadcastRequest, PendingTransactionRecord } from './types';
import type { AppLogger } from '../../utils/logger';

export class BroadcastRejectedError extends Error {
  constructor(
    message: string,
    public readonly txId: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = 'BroadcastRejectedError';
  }
}

export class TransactionBroadcaster {
  constructor(
    private readonly nodeClient: TransactionNodeClient,
    private readonly pendingStore: PendingTransactionStore,
    private readonly logger: AppLogger
  ) {}

  async broadcast(request: BroadcastRequest): Promise<PendingTransactionRecord> {
    const response = await this.nodeClient.broadcastSignedTransaction(request.signedTransaction);

    if (!response.accepted) {
      this.logger.error(
        {
          reason: response.reason,
          retryable: response.retryable,
          txId: response.txId,
          vaultId: request.vaultId,
          strategyId: request.strategyId,
        },
        'Transaction broadcast rejected by node'
      );
      throw new BroadcastRejectedError(
        response.reason ?? 'Transaction broadcast rejected',
        response.txId,
        response.retryable ?? false
      );
    }

    const now = new Date().toISOString();
    const pendingRecord: PendingTransactionRecord = {
      txId: response.txId,
      vaultId: request.vaultId,
      strategyId: request.strategyId,
      contractPrincipal: request.contractPrincipal,
      functionName: request.functionName,
      nonce: request.nonce,
      feeMicroStx: request.feeMicroStx,
      retryAttempt: request.retryAttempt,
      submittedAtBlockHeight: request.submittedAtBlockHeight,
      submittedAt: now,
      updatedAt: now,
      state: 'pending',
      confirmations: 0,
    };

    this.pendingStore.upsert(pendingRecord);

    this.logger.info(
      {
        txId: response.txId,
        vaultId: request.vaultId,
        strategyId: request.strategyId,
        nonce: request.nonce.toString(),
        feeMicroStx: request.feeMicroStx.toString(),
      },
      'Broadcasted transaction and stored pending record'
    );

    return pendingRecord;
  }
}
