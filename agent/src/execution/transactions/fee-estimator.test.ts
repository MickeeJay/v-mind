import { describe, expect, it, vi } from 'vitest';
import { TestLogger } from '../../utils/test-logger';
import type { TransactionNodeClient } from './stacks-node-client';
import { FeeEstimator } from './fee-estimator';
import type { UnsignedContractCallTransaction } from './types';

describe('FeeEstimator', () => {
  it('applies the configured fee multiplier to node estimates', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn().mockResolvedValue(200n),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const estimator = new FeeEstimator({
      nodeClient,
      feeMultiplier: 1.5,
      logger: new TestLogger(),
    });

    const unsignedTx = {
      transaction: {} as UnsignedContractCallTransaction['transaction'],
      contractAddress: 'ST000000000000000000002AMW42H',
      contractName: 'vault-core',
      functionName: 'execute-strategy',
      functionArgs: [],
      senderKey: 'a'.repeat(64),
    } satisfies UnsignedContractCallTransaction;

    const estimate = await estimator.estimateFee(unsignedTx);

    expect(estimate.baseFeeMicroStx).toBe(200n);
    expect(estimate.feeMicroStx).toBe(300n);
    expect(estimate.multiplier).toBe(1.5);
  });

  it('enforces a configured minimum fee floor', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn().mockResolvedValue(50n),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const estimator = new FeeEstimator({
      nodeClient,
      feeMultiplier: 1.1,
      minFeeMicroStx: 125n,
      logger: new TestLogger(),
    });

    const estimate = await estimator.estimateFee({
      transaction: {} as UnsignedContractCallTransaction['transaction'],
      contractAddress: 'ST000000000000000000002AMW42H',
      contractName: 'vault-core',
      functionName: 'execute-strategy',
      functionArgs: [],
      senderKey: 'b'.repeat(64),
    });

    expect(estimate.feeMicroStx).toBe(125n);
  });

  it('handles large base fees without precision loss', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn(),
      estimateContractCallFee: vi.fn().mockResolvedValue(10_000_000_000_000n),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const estimator = new FeeEstimator({
      nodeClient,
      feeMultiplier: 1.2,
      logger: new TestLogger(),
    });

    const estimate = await estimator.estimateFee({
      transaction: {} as UnsignedContractCallTransaction['transaction'],
      contractAddress: 'ST000000000000000000002AMW42H',
      contractName: 'vault-core',
      functionName: 'execute-strategy',
      functionArgs: [],
      senderKey: 'c'.repeat(64),
    });

    expect(estimate.feeMicroStx).toBe(12_000_000_000_000n);
  });
});
