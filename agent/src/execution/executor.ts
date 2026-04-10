import type { ClarityValue } from '@stacks/transactions';
import type { StacksTransactionBuilder } from '../blockchain';
import type { AppLogger } from '../utils/logger';
import type { SubmissionTracker } from './submission-tracker';

export interface ExecutionRequest {
  vaultId: string;
  strategyId: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  fee?: number;
  nonce?: number;
}

export interface StrategyExecutor {
  execute(request: ExecutionRequest): Promise<string>;
}

export class StrategyTransactionExecutor implements StrategyExecutor {
  constructor(
    private readonly senderKey: string,
    private readonly transactionBuilder: StacksTransactionBuilder,
    private readonly tracker: SubmissionTracker,
    private readonly logger: AppLogger
  ) {}

  async execute(request: ExecutionRequest): Promise<string> {
    const transaction = await this.transactionBuilder.buildSignedContractCall({
      senderKey: this.senderKey,
      contractAddress: request.contractAddress,
      contractName: request.contractName,
      functionName: request.functionName,
      functionArgs: request.functionArgs,
      fee: request.fee,
      nonce: request.nonce,
    });

    const submission = this.tracker.track(this.transactionBuilder.submitSignedTransaction(transaction));
    const result = await submission;

    this.logger.info(
      {
        vaultId: request.vaultId,
        strategyId: request.strategyId,
        contractName: request.contractName,
        functionName: request.functionName,
        txId: result.txId,
      },
      'Submitted strategy execution transaction'
    );

    return result.txId;
  }
}