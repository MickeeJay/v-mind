import { describe, expect, it, vi } from 'vitest';

import { TestLogger } from '../../utils/test-logger';

import { ConfirmationPoller } from './confirmation-poller';
import { InMemoryPendingTransactionStore } from './pending-transaction-store';

import type { TransactionNodeClient } from './stacks-node-client';

describe('ConfirmationPoller', () => {
  it('marks transactions confirmed after required confirmations', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi
        .fn()
        .mockResolvedValueOnce({
          txId: '0xabc',
          status: 'pending',
          retryable: false,
        })
        .mockResolvedValueOnce({
          txId: '0xabc',
          status: 'success',
          blockHeight: 100,
          retryable: false,
        }),
      getCurrentBlockHeight: vi.fn().mockResolvedValue(101),
    };

    const store = new InMemoryPendingTransactionStore();
    store.upsert({
      txId: '0xabc',
      vaultId: '1',
      strategyId: '2',
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      nonce: 3n,
      feeMicroStx: 200n,
      retryAttempt: 1,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'pending',
      confirmations: 0,
    });

    const poller = new ConfirmationPoller(
      nodeClient,
      store,
      {
        requiredConfirmations: 2,
        pollIntervalMs: 0,
        maxPollAttempts: 3,
      },
      new TestLogger()
    );

    const outcome = await poller.waitForConfirmation('0xabc');

    expect(outcome.state).toBe('confirmed');
    expect(outcome.confirmations).toBe(2);
    expect(store.get('0xabc')?.state).toBe('confirmed');
  });

  it('triggers retry flow for retryable failures', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn().mockResolvedValue({
        txId: '0xretry',
        status: 'dropped_too_expensive',
        retryable: true,
        reason: '(err fee-too-low)',
      }),
      getCurrentBlockHeight: vi.fn(),
    };

    const store = new InMemoryPendingTransactionStore();
    store.upsert({
      txId: '0xretry',
      vaultId: '3',
      strategyId: '4',
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      nonce: 7n,
      feeMicroStx: 250n,
      retryAttempt: 1,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'pending',
      confirmations: 0,
    });

    const poller = new ConfirmationPoller(
      nodeClient,
      store,
      {
        requiredConfirmations: 1,
        pollIntervalMs: 0,
        maxPollAttempts: 1,
      },
      new TestLogger()
    );

    const onRetryableFailure = vi.fn();
    const outcome = await poller.waitForConfirmation('0xretry', {
      onRetryableFailure,
    });

    expect(outcome.state).toBe('retry-triggered');
    expect(onRetryableFailure).toHaveBeenCalledTimes(1);
  });

  it('includes last status when confirmation polling times out', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn().mockResolvedValue({
        txId: '0xtimeout',
        status: 'pending',
        retryable: false,
      }),
      getCurrentBlockHeight: vi.fn(),
    };

    const store = new InMemoryPendingTransactionStore();
    store.upsert({
      txId: '0xtimeout',
      vaultId: '6',
      strategyId: '7',
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      nonce: 9n,
      feeMicroStx: 270n,
      retryAttempt: 1,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'pending',
      confirmations: 0,
    });

    const poller = new ConfirmationPoller(
      nodeClient,
      store,
      {
        requiredConfirmations: 2,
        pollIntervalMs: 0,
        maxPollAttempts: 1,
      },
      new TestLogger()
    );

    await expect(poller.waitForConfirmation('0xtimeout')).rejects.toThrow('last status: pending');
  });
});
