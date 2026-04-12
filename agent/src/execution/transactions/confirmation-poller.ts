import type { AppLogger } from '../../utils/logger';
import type { PendingTransactionStore } from './pending-transaction-store';
import type { TransactionNodeClient } from './stacks-node-client';
import type {
  ConfirmationOutcome,
  PendingTransactionRecord,
  RetryableFailureContext,
  TransactionStatus,
} from './types';

export interface ConfirmationPollerOptions {
  requiredConfirmations: number;
  pollIntervalMs: number;
  maxPollAttempts: number;
}

export interface WaitForConfirmationOptions {
  onRetryableFailure?: (context: RetryableFailureContext) => Promise<void>;
}

export class ConfirmationPoller {
  constructor(
    private readonly nodeClient: TransactionNodeClient,
    private readonly pendingStore: PendingTransactionStore,
    private readonly options: ConfirmationPollerOptions,
    private readonly logger: AppLogger
  ) {}

  async waitForConfirmation(txId: string, options: WaitForConfirmationOptions = {}): Promise<ConfirmationOutcome> {
    let lastObservedStatus: string | undefined;

    for (let attempt = 1; attempt <= this.options.maxPollAttempts; attempt += 1) {
      const record = this.pendingStore.get(txId);
      if (!record) {
        throw new Error(`Missing pending record for tx ${txId}`);
      }

      const status = await this.nodeClient.getTransactionStatus(record.txId);
      lastObservedStatus = status.status;

      const outcome = await this.pollRecord(record, options.onRetryableFailure, status);
      if (outcome) {
        return outcome;
      }

      await sleep(this.options.pollIntervalMs);
    }

    throw new Error(
      `Transaction ${txId} was not confirmed within ${this.options.maxPollAttempts} polling attempts (last status: ${lastObservedStatus ?? 'unknown'})`
    );
  }

  async pollPendingTransactions(options: WaitForConfirmationOptions = {}): Promise<ConfirmationOutcome[]> {
    const pendingRecords = this.pendingStore.listPending();
    const outcomes: ConfirmationOutcome[] = [];

    for (const record of pendingRecords) {
      const outcome = await this.pollRecord(record, options.onRetryableFailure);
      if (outcome) {
        outcomes.push(outcome);
      }
    }

    return outcomes;
  }

  private async pollRecord(
    record: PendingTransactionRecord,
    onRetryableFailure?: (context: RetryableFailureContext) => Promise<void>,
    prefetchedStatus?: TransactionStatus
  ): Promise<ConfirmationOutcome | null> {
    const txStatus = prefetchedStatus ?? (await this.nodeClient.getTransactionStatus(record.txId));

    if (txStatus.status === 'pending') {
      return null;
    }

    if (txStatus.status === 'success') {
      const confirmations = await this.getConfirmationCount(txStatus);
      if (confirmations < this.options.requiredConfirmations) {
        this.pendingStore.update(record.txId, {
          confirmations,
          updatedAt: new Date().toISOString(),
        });
        return null;
      }

      this.pendingStore.update(record.txId, {
        state: 'confirmed',
        confirmations,
        updatedAt: new Date().toISOString(),
      });

      this.logger.info(
        {
          txId: record.txId,
          confirmations,
        },
        'Transaction reached required confirmations'
      );

      return {
        state: 'confirmed',
        txId: record.txId,
        confirmations,
      };
    }

    return this.handleFailure(record, txStatus, onRetryableFailure);
  }

  private async handleFailure(
    record: PendingTransactionRecord,
    txStatus: TransactionStatus,
    onRetryableFailure?: (context: RetryableFailureContext) => Promise<void>
  ): Promise<ConfirmationOutcome> {
    this.pendingStore.update(record.txId, {
      state: 'failed',
      lastError: txStatus.reason ?? txStatus.status,
      updatedAt: new Date().toISOString(),
    });

    this.logger.error(
      {
        txId: record.txId,
        status: txStatus.status,
        reason: txStatus.reason,
      },
      'Transaction failed'
    );

    if (txStatus.retryable && onRetryableFailure) {
      await onRetryableFailure({ record, status: txStatus });

      return {
        state: 'retry-triggered',
        txId: record.txId,
        confirmations: 0,
        reason: txStatus.reason,
        retryable: true,
      };
    }

    return {
      state: 'failed',
      txId: record.txId,
      confirmations: 0,
      reason: txStatus.reason,
      retryable: txStatus.retryable,
    };
  }

  private async getConfirmationCount(status: TransactionStatus): Promise<number> {
    if (typeof status.blockHeight !== 'number') {
      return 0;
    }

    const currentBlockHeight = await this.nodeClient.getCurrentBlockHeight();
    return Math.max(0, currentBlockHeight - status.blockHeight + 1);
  }
}

async function sleep(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), durationMs);
  });
}
