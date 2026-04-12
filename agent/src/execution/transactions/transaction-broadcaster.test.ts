import { describe, expect, it, vi } from 'vitest';
import { TestLogger } from '../../utils/test-logger';
import { InMemoryPendingTransactionStore } from './pending-transaction-store';
import type { TransactionNodeClient } from './stacks-node-client';
import { BroadcastRejectedError, TransactionBroadcaster } from './transaction-broadcaster';

describe('TransactionBroadcaster', () => {
  it('broadcasts a signed transaction and stores pending state', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn().mockResolvedValue({
        accepted: true,
        txId: '0xabc123',
      }),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const store = new InMemoryPendingTransactionStore();
    const broadcaster = new TransactionBroadcaster(nodeClient, store, new TestLogger());

    const record = await broadcaster.broadcast({
      signedTransaction: {} as never,
      vaultId: '1',
      strategyId: '2',
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      nonce: 10n,
      feeMicroStx: 500n,
      retryAttempt: 1,
    });

    expect(record.txId).toBe('0xabc123');
    expect(record.state).toBe('pending');
    expect(store.get('0xabc123')?.nonce).toBe(10n);
  });

  it('throws when node rejects the broadcast', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn().mockResolvedValue({
        accepted: false,
        txId: '0xrejected',
        reason: 'FeeTooLow',
      }),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const broadcaster = new TransactionBroadcaster(nodeClient, new InMemoryPendingTransactionStore(), new TestLogger());

    await expect(
      broadcaster.broadcast({
        signedTransaction: {} as never,
        vaultId: '1',
        strategyId: '2',
        contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
        functionName: 'execute-strategy',
        nonce: 11n,
        feeMicroStx: 510n,
        retryAttempt: 1,
      })
    ).rejects.toThrow('FeeTooLow');
  });

  it('exposes retryability on rejected broadcasts', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn().mockResolvedValue({
        accepted: false,
        txId: '0xretryable-reject',
        reason: 'TemporarilyBlacklisted',
        retryable: true,
      }),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const broadcaster = new TransactionBroadcaster(nodeClient, new InMemoryPendingTransactionStore(), new TestLogger());

    await expect(
      broadcaster.broadcast({
        signedTransaction: {} as never,
        vaultId: '1',
        strategyId: '2',
        contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
        functionName: 'execute-strategy',
        nonce: 12n,
        feeMicroStx: 500n,
        retryAttempt: 1,
      })
    ).rejects.toMatchObject<BroadcastRejectedError>({
      retryable: true,
      txId: '0xretryable-reject',
    });
  });
});
