import type { PendingTransactionRecord } from '../execution';
import type { AppLogger } from '../utils/logger';

export interface AgentAlertingOptions {
  staleBlockThresholdMs: number;
  pendingTxBlockThreshold: number;
  consecutiveFailureThreshold: number;
  logger: AppLogger;
}

export class AgentAlerting {
  private readonly startedAtMs = Date.now();
  private lastProcessedBlockAtMs: number | undefined;
  private staleBlockAlertRaised = false;
  private readonly pendingAlertedTxIds = new Set<string>();
  private readonly vaultConsecutiveFailures = new Map<string, number>();
  private readonly failureAlertedVaults = new Set<string>();

  constructor(private readonly options: AgentAlertingOptions) {}

  recordProcessedBlock(observedAtMs = Date.now()): void {
    this.lastProcessedBlockAtMs = observedAtMs;
    this.staleBlockAlertRaised = false;
  }

  checkStaleBlock(nowMs = Date.now()): void {
    const baseline = this.lastProcessedBlockAtMs ?? this.startedAtMs;
    const staleForMs = nowMs - baseline;
    if (staleForMs <= this.options.staleBlockThresholdMs || this.staleBlockAlertRaised) {
      return;
    }

    this.staleBlockAlertRaised = true;
    this.options.logger.warn(
      {
        alertType: 'stale-block-processing',
        staleForMs,
        thresholdMs: this.options.staleBlockThresholdMs,
      },
      'Agent has not processed a new block within the configured threshold'
    );
  }

  checkPendingTransactions(pendingTransactions: PendingTransactionRecord[], currentBlockHeight: number): void {
    for (const pending of pendingTransactions) {
      if (typeof pending.submittedAtBlockHeight !== 'number') {
        continue;
      }

      const pendingBlocks = currentBlockHeight - pending.submittedAtBlockHeight;
      if (pendingBlocks <= this.options.pendingTxBlockThreshold) {
        continue;
      }

      if (this.pendingAlertedTxIds.has(pending.txId)) {
        continue;
      }

      this.pendingAlertedTxIds.add(pending.txId);
      this.options.logger.warn(
        {
          alertType: 'long-pending-transaction',
          txId: pending.txId,
          vaultId: pending.vaultId,
          strategyId: pending.strategyId,
          pendingBlocks,
          thresholdBlocks: this.options.pendingTxBlockThreshold,
        },
        'Transaction has remained pending for too many blocks'
      );
    }
  }

  recordExecutionFailure(vaultId: string): void {
    const nextFailures = (this.vaultConsecutiveFailures.get(vaultId) ?? 0) + 1;
    this.vaultConsecutiveFailures.set(vaultId, nextFailures);

    if (nextFailures <= this.options.consecutiveFailureThreshold) {
      return;
    }

    if (this.failureAlertedVaults.has(vaultId)) {
      return;
    }

    this.failureAlertedVaults.add(vaultId);
    this.options.logger.warn(
      {
        alertType: 'vault-consecutive-execution-failures',
        vaultId,
        consecutiveFailures: nextFailures,
        threshold: this.options.consecutiveFailureThreshold,
      },
      'Vault has exceeded consecutive execution failure threshold'
    );
  }

  recordExecutionSuccess(vaultId: string): void {
    this.vaultConsecutiveFailures.delete(vaultId);
    this.failureAlertedVaults.delete(vaultId);
  }
}
