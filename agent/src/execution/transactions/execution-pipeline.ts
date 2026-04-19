import { type ConfirmationPoller } from './confirmation-poller';
import { type FeeEstimator } from './fee-estimator';
import { type NonceManager } from './nonce-manager';
import { BroadcastRejectedError, type TransactionBroadcaster } from './transaction-broadcaster';
import { type TransactionBuilder } from './transaction-builder';
import { type TransactionSigner } from './transaction-signer';

import type { ExecutionPipelineRequest, ExecutionPipelineResult } from './types';
import type { StrategyEvaluationResult } from '../../strategies';
import type { AppLogger } from '../../utils/logger';

export interface ExecutionPipelineDependencies {
  transactionBuilder: TransactionBuilder;
  feeEstimator: FeeEstimator;
  nonceManager: NonceManager;
  transactionSigner: TransactionSigner;
  transactionBroadcaster: TransactionBroadcaster;
  confirmationPoller: ConfirmationPoller;
  logger: AppLogger;
}

export class ExecutionPipeline {
  constructor(private readonly dependencies: ExecutionPipelineDependencies) {}

  async execute(
    request: ExecutionPipelineRequest,
    evaluation: Pick<StrategyEvaluationResult, 'decision'>
  ): Promise<ExecutionPipelineResult> {
    if (evaluation.decision !== 'execute') {
      throw new Error('Execution pipeline can only run for execute decisions');
    }

    const maxRetries = request.maxRetries ?? 2;
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error('maxRetries must be a non-negative integer');
    }

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const nonce = await this.dependencies.nonceManager.allocateNonce(request.senderAddress);
        const unsignedTransaction = await this.dependencies.transactionBuilder.buildUnsignedContractCall({
          contractPrincipal: request.contractPrincipal,
          functionName: request.functionName,
          functionArgs: request.functionArgs,
          senderKey: request.senderKey,
        });
        const feeEstimate = await this.dependencies.feeEstimator.estimateFee(unsignedTransaction);
        const signedTransaction = await this.dependencies.transactionSigner.sign({
          unsigned: unsignedTransaction,
          feeMicroStx: feeEstimate.feeMicroStx,
          nonce,
          senderKey: request.senderKey,
        });

        const pendingRecord = await this.dependencies.transactionBroadcaster.broadcast({
          signedTransaction,
          vaultId: request.vaultId,
          strategyId: request.strategyId,
          contractPrincipal: request.contractPrincipal,
          functionName: request.functionName,
          nonce,
          feeMicroStx: feeEstimate.feeMicroStx,
          retryAttempt: attempt,
          submittedAtBlockHeight: request.observedBlockHeight,
        });

        this.dependencies.nonceManager.markPending(pendingRecord.txId, nonce);

        const outcome = await this.dependencies.confirmationPoller.waitForConfirmation(pendingRecord.txId, {
          onRetryableFailure: async ({ record, status }) => {
            this.dependencies.nonceManager.markFailed(record.txId, true);
            this.dependencies.logger.warn(
              {
                txId: record.txId,
                status: status.status,
                reason: status.reason,
                attempt,
              },
              'Retryable transaction failure detected; pipeline will resubmit'
            );

            await Promise.resolve();
          },
        });

        if (outcome.state === 'confirmed') {
          this.dependencies.nonceManager.markConfirmed(pendingRecord.txId);

          this.dependencies.logger.info(
            {
              txId: pendingRecord.txId,
              vaultId: request.vaultId,
              strategyId: request.strategyId,
              attempt,
              evaluationReason: request.evaluationReason,
            },
            'Execution pipeline confirmed transaction'
          );

          return {
            txId: pendingRecord.txId,
            nonce,
            feeMicroStx: feeEstimate.feeMicroStx,
            confirmations: outcome.confirmations,
            attempts: attempt,
          };
        }

        this.dependencies.nonceManager.markFailed(pendingRecord.txId, outcome.retryable ?? false);

        if (outcome.state === 'retry-triggered' && attempt <= maxRetries) {
          continue;
        }

        throw new Error(outcome.reason ?? 'Transaction execution failed');
      } catch (error) {
        if (error instanceof BroadcastRejectedError && error.retryable && attempt <= maxRetries) {
          await this.dependencies.nonceManager.resetFromChain(request.senderAddress);

          this.dependencies.logger.warn(
            {
              txId: error.txId,
              reason: error.message,
              attempt,
            },
            'Broadcast rejected with retryable reason; retrying execution pipeline'
          );
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Execution pipeline exhausted retries after ${maxRetries + 1} attempts`);
  }
}
