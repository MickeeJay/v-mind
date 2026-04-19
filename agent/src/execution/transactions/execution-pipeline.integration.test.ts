import { StacksTestnet } from '@stacks/network';
import { uintCV } from '@stacks/transactions';
import { describe, expect, it, vi } from 'vitest';

import { TestLogger } from '../../utils/test-logger';

import { ConfirmationPoller } from './confirmation-poller';
import { ExecutionPipeline } from './execution-pipeline';
import { FeeEstimator } from './fee-estimator';
import { NonceManager } from './nonce-manager';
import { InMemoryPendingTransactionStore } from './pending-transaction-store';
import { TransactionBroadcaster } from './transaction-broadcaster';
import { TransactionBuilder } from './transaction-builder';
import { TransactionSigner } from './transaction-signer';

import type { TransactionNodeClient } from './stacks-node-client';

const senderKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const senderAddress = 'ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X';

describe('ExecutionPipeline integration', () => {
  it('runs build, estimate, nonce, sign, broadcast, and confirmation flow end-to-end', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn().mockResolvedValue({ nonce: 20n, possibleNextNonce: 20n }),
      estimateContractCallFee: vi.fn().mockResolvedValue(300n),
      broadcastSignedTransaction: vi.fn().mockResolvedValue({
        accepted: true,
        txId: '0xconfirmed',
      }),
      getTransactionStatus: vi.fn().mockResolvedValue({
        txId: '0xconfirmed',
        status: 'success',
        blockHeight: 500,
        retryable: false,
      }),
      getCurrentBlockHeight: vi.fn().mockResolvedValue(500),
    };

    const logger = new TestLogger();
    const store = new InMemoryPendingTransactionStore();
    const pipeline = new ExecutionPipeline({
      transactionBuilder: new TransactionBuilder(new StacksTestnet(), logger, senderKey),
      feeEstimator: new FeeEstimator({
        nodeClient,
        feeMultiplier: 1.25,
        logger,
      }),
      nonceManager: new NonceManager(nodeClient, logger),
      transactionSigner: new TransactionSigner(new StacksTestnet(), logger, senderKey),
      transactionBroadcaster: new TransactionBroadcaster(nodeClient, store, logger),
      confirmationPoller: new ConfirmationPoller(
        nodeClient,
        store,
        {
          requiredConfirmations: 1,
          pollIntervalMs: 0,
          maxPollAttempts: 2,
        },
        logger
      ),
      logger,
    });

    const result = await pipeline.execute(
      {
        vaultId: '1',
        strategyId: '2',
        senderAddress,
        contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
        functionName: 'execute-strategy',
        functionArgs: [uintCV(1n)],
        evaluationReason: 'ready',
        maxRetries: 1,
      },
      { decision: 'execute' }
    );

    expect(result.txId).toBe('0xconfirmed');
    expect(result.nonce).toBe(20n);
    expect(result.feeMicroStx).toBe(375n);
    expect(result.attempts).toBe(1);
  });

  it('retries execution when poller identifies retryable failure', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi
        .fn()
        .mockResolvedValueOnce({ nonce: 7n, possibleNextNonce: 7n })
        .mockResolvedValueOnce({ nonce: 8n, possibleNextNonce: 8n }),
      estimateContractCallFee: vi.fn().mockResolvedValue(200n),
      broadcastSignedTransaction: vi
        .fn()
        .mockResolvedValueOnce({ accepted: true, txId: '0xretry-1' })
        .mockResolvedValueOnce({ accepted: true, txId: '0xretry-2' }),
      getTransactionStatus: vi
        .fn()
        .mockResolvedValueOnce({
          txId: '0xretry-1',
          status: 'dropped_too_expensive',
          retryable: true,
          reason: '(err fee-too-low)',
        })
        .mockResolvedValueOnce({
          txId: '0xretry-2',
          status: 'success',
          blockHeight: 600,
          retryable: false,
        }),
      getCurrentBlockHeight: vi.fn().mockResolvedValue(600),
    };

    const logger = new TestLogger();
    const store = new InMemoryPendingTransactionStore();
    const pipeline = new ExecutionPipeline({
      transactionBuilder: new TransactionBuilder(new StacksTestnet(), logger, senderKey),
      feeEstimator: new FeeEstimator({
        nodeClient,
        feeMultiplier: 1.1,
        logger,
      }),
      nonceManager: new NonceManager(nodeClient, logger),
      transactionSigner: new TransactionSigner(new StacksTestnet(), logger, senderKey),
      transactionBroadcaster: new TransactionBroadcaster(nodeClient, store, logger),
      confirmationPoller: new ConfirmationPoller(
        nodeClient,
        store,
        {
          requiredConfirmations: 1,
          pollIntervalMs: 0,
          maxPollAttempts: 1,
        },
        logger
      ),
      logger,
    });

    const result = await pipeline.execute(
      {
        vaultId: '4',
        strategyId: '5',
        senderAddress,
        contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
        functionName: 'execute-strategy',
        functionArgs: [uintCV(2n)],
        evaluationReason: 'retry path',
        maxRetries: 2,
      },
      { decision: 'execute' }
    );

    expect(result.txId).toBe('0xretry-2');
    expect(result.attempts).toBe(2);
    expect(nodeClient.broadcastSignedTransaction).toHaveBeenCalledTimes(2);
  });

  it('resubmits after retryable broadcast rejection', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi
        .fn()
        .mockResolvedValueOnce({ nonce: 15n, possibleNextNonce: 15n })
        .mockResolvedValueOnce({ nonce: 16n, possibleNextNonce: 16n }),
      estimateContractCallFee: vi.fn().mockResolvedValue(220n),
      broadcastSignedTransaction: vi
        .fn()
        .mockResolvedValueOnce({
          accepted: false,
          txId: '0xreject-1',
          reason: 'TemporarilyBlacklisted',
          retryable: true,
        })
        .mockResolvedValueOnce({ accepted: true, txId: '0xaccepted-2' }),
      getTransactionStatus: vi.fn().mockResolvedValue({
        txId: '0xaccepted-2',
        status: 'success',
        blockHeight: 700,
        retryable: false,
      }),
      getCurrentBlockHeight: vi.fn().mockResolvedValue(700),
    };

    const logger = new TestLogger();
    const store = new InMemoryPendingTransactionStore();
    const pipeline = new ExecutionPipeline({
      transactionBuilder: new TransactionBuilder(new StacksTestnet(), logger, senderKey),
      feeEstimator: new FeeEstimator({
        nodeClient,
        feeMultiplier: 1.1,
        logger,
      }),
      nonceManager: new NonceManager(nodeClient, logger),
      transactionSigner: new TransactionSigner(new StacksTestnet(), logger, senderKey),
      transactionBroadcaster: new TransactionBroadcaster(nodeClient, store, logger),
      confirmationPoller: new ConfirmationPoller(
        nodeClient,
        store,
        {
          requiredConfirmations: 1,
          pollIntervalMs: 0,
          maxPollAttempts: 1,
        },
        logger
      ),
      logger,
    });

    const result = await pipeline.execute(
      {
        vaultId: '6',
        strategyId: '7',
        senderAddress,
        contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
        functionName: 'execute-strategy',
        functionArgs: [uintCV(3n)],
        evaluationReason: 'retry broadcast',
        maxRetries: 2,
      },
      { decision: 'execute' }
    );

    expect(result.txId).toBe('0xaccepted-2');
    expect(result.attempts).toBe(2);
    expect(nodeClient.broadcastSignedTransaction).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid retry configuration before transaction submission', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const logger = new TestLogger();
    const store = new InMemoryPendingTransactionStore();
    const pipeline = new ExecutionPipeline({
      transactionBuilder: new TransactionBuilder(new StacksTestnet(), logger, senderKey),
      feeEstimator: new FeeEstimator({
        nodeClient,
        feeMultiplier: 1.1,
        logger,
      }),
      nonceManager: new NonceManager(nodeClient, logger),
      transactionSigner: new TransactionSigner(new StacksTestnet(), logger, senderKey),
      transactionBroadcaster: new TransactionBroadcaster(nodeClient, store, logger),
      confirmationPoller: new ConfirmationPoller(
        nodeClient,
        store,
        {
          requiredConfirmations: 1,
          pollIntervalMs: 0,
          maxPollAttempts: 1,
        },
        logger
      ),
      logger,
    });

    await expect(
      pipeline.execute(
        {
          vaultId: '9',
          strategyId: '10',
          senderAddress,
          contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
          functionName: 'execute-strategy',
          functionArgs: [uintCV(4n)],
          evaluationReason: 'invalid retries',
          maxRetries: -1,
        },
        { decision: 'execute' }
      )
    ).rejects.toThrow('maxRetries must be a non-negative integer');
  });
});
