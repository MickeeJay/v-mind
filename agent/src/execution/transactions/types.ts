import type { ClarityValue, StacksTransaction } from '@stacks/transactions';

export interface BuildUnsignedTransactionRequest {
  contractPrincipal: string;
  functionName: string;
  functionArgs: ClarityValue[];
  senderKey?: string;
  nonce?: bigint;
  fee?: bigint;
}

export interface UnsignedContractCallTransaction {
  transaction: StacksTransaction;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  senderKey: string;
}

export interface SignTransactionRequest {
  unsigned: UnsignedContractCallTransaction;
  feeMicroStx: bigint;
  nonce: bigint;
  senderKey?: string;
}

export interface BroadcastRequest {
  signedTransaction: StacksTransaction;
  vaultId: string;
  strategyId: string;
  contractPrincipal: string;
  functionName: string;
  nonce: bigint;
  feeMicroStx: bigint;
  retryAttempt: number;
}

export type PendingTransactionState = 'pending' | 'confirmed' | 'failed';

export interface PendingTransactionRecord {
  txId: string;
  vaultId: string;
  strategyId: string;
  contractPrincipal: string;
  functionName: string;
  nonce: bigint;
  feeMicroStx: bigint;
  retryAttempt: number;
  submittedAt: string;
  updatedAt: string;
  state: PendingTransactionState;
  confirmations: number;
  lastError?: string;
}

export interface FeeEstimate {
  feeMicroStx: bigint;
  baseFeeMicroStx: bigint;
  multiplier: number;
}

export interface OnChainNonceState {
  nonce: bigint;
  possibleNextNonce: bigint;
}

export interface BroadcastResult {
  accepted: boolean;
  txId: string;
  reason?: string;
  retryable?: boolean;
}

export type TxStatus =
  | 'pending'
  | 'success'
  | 'abort_by_response'
  | 'abort_by_post_condition'
  | 'dropped_replace_by_fee'
  | 'dropped_replace_across_fork'
  | 'dropped_too_expensive'
  | 'dropped_stale_garbage_collect'
  | 'unknown';

export interface TransactionStatus {
  txId: string;
  status: TxStatus;
  blockHeight?: number;
  burnBlockHeight?: number;
  reason?: string;
  retryable: boolean;
}

export interface ConfirmationOutcome {
  state: 'confirmed' | 'failed' | 'retry-triggered';
  txId: string;
  confirmations: number;
  reason?: string;
  retryable?: boolean;
}

export interface RetryableFailureContext {
  record: PendingTransactionRecord;
  status: TransactionStatus;
}

export interface ExecutionPipelineRequest {
  vaultId: string;
  strategyId: string;
  senderAddress: string;
  contractPrincipal: string;
  functionName: string;
  functionArgs: ClarityValue[];
  evaluationReason: string;
  maxRetries?: number;
  senderKey?: string;
}

export interface ExecutionPipelineResult {
  txId: string;
  nonce: bigint;
  feeMicroStx: bigint;
  confirmations: number;
  attempts: number;
}
