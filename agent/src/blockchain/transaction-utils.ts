import { StacksNetwork } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  makeContractCall,
  type ClarityValue,
  type StacksTransaction,
} from '@stacks/transactions';
import pRetry from 'p-retry';
import { z } from 'zod';
import type { AgentConfig } from '../config';
import type { AppLogger } from '../utils/logger';

export interface TransactionSubmissionResult {
  txId: string;
  accepted: boolean;
  reason?: string;
}

export interface ContractCallRequest {
  senderKey: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  fee?: number | bigint;
  nonce?: number | bigint;
}

export interface StacksTransactionBuilder {
  buildSignedContractCall(request: ContractCallRequest): Promise<StacksTransaction>;
  submitSignedTransaction(transaction: StacksTransaction): Promise<TransactionSubmissionResult>;
}

const successfulBroadcastSchema = z.union([
  z.string().min(1),
  z.object({ txid: z.string().min(1) }),
  z.object({ txId: z.string().min(1) }),
]);

const failedBroadcastSchema = z.object({
  error: z.string(),
  reason: z.string().optional(),
  txid: z.string().optional(),
});

export class StacksTransactionService implements StacksTransactionBuilder {
  constructor(
    private readonly network: StacksNetwork,
    private readonly config: Pick<AgentConfig, 'retry'>,
    private readonly logger: AppLogger
  ) {}

  async buildSignedContractCall(request: ContractCallRequest): Promise<StacksTransaction> {
    return makeContractCall({
      senderKey: request.senderKey,
      contractAddress: request.contractAddress,
      contractName: request.contractName,
      functionName: request.functionName,
      functionArgs: request.functionArgs,
      postConditionMode: PostConditionMode.Allow,
      anchorMode: AnchorMode.Any,
      fee: request.fee,
      nonce: request.nonce,
      network: this.network,
    });
  }

  async submitSignedTransaction(transaction: StacksTransaction): Promise<TransactionSubmissionResult> {
    return pRetry(
      async () => {
        const response = await broadcastTransaction(transaction, this.network);

        const failed = failedBroadcastSchema.safeParse(response);
        if (failed.success) {
          throw new Error(failed.data.reason ?? failed.data.error);
        }

        const successful = successfulBroadcastSchema.parse(response);
        if (typeof successful === 'string') {
          return { txId: successful, accepted: true };
        }

        if ('txid' in successful) {
          return { txId: successful.txid, accepted: true };
        }

        return { txId: successful.txId, accepted: true };
      },
      {
        retries: this.config.retry.attempts - 1,
        minTimeout: this.config.retry.minTimeoutMs,
        maxTimeout: this.config.retry.maxTimeoutMs,
        onFailedAttempt: (error) => {
          this.logger.warn(
            {
              attemptNumber: error.attemptNumber,
              retriesLeft: error.retriesLeft,
              message: error.message,
            },
            'Failed to submit signed transaction, retrying'
          );
        },
      }
    );
  }
}