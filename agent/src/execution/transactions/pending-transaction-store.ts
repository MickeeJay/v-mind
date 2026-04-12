import type { PendingTransactionRecord } from './types';

export interface PendingTransactionStore {
  upsert(record: PendingTransactionRecord): void;
  get(txId: string): PendingTransactionRecord | undefined;
  listPending(): PendingTransactionRecord[];
  update(txId: string, update: Partial<PendingTransactionRecord>): PendingTransactionRecord | undefined;
}

export class InMemoryPendingTransactionStore implements PendingTransactionStore {
  private readonly records = new Map<string, PendingTransactionRecord>();

  upsert(record: PendingTransactionRecord): void {
    this.records.set(record.txId, record);
  }

  get(txId: string): PendingTransactionRecord | undefined {
    return this.records.get(txId);
  }

  listPending(): PendingTransactionRecord[] {
    return Array.from(this.records.values()).filter((record) => record.state === 'pending');
  }

  update(txId: string, update: Partial<PendingTransactionRecord>): PendingTransactionRecord | undefined {
    const existing = this.records.get(txId);
    if (!existing) {
      return undefined;
    }

    const nextRecord: PendingTransactionRecord = {
      ...existing,
      ...update,
      txId: existing.txId,
    };

    this.records.set(txId, nextRecord);
    return nextRecord;
  }
}
