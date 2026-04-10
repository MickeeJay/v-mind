export interface TransactionSubmissionResult {
  txId: string;
  accepted: boolean;
}

export interface StacksTransactionBuilder {
  submitSignedTransaction(rawTx: string): Promise<TransactionSubmissionResult>;
}