import { describe, expect, it, vi } from 'vitest';
import { TestLogger } from '../../utils/test-logger';
import type { TransactionNodeClient } from './stacks-node-client';
import { NonceManager } from './nonce-manager';

describe('NonceManager', () => {
  it('initializes from chain possible next nonce and allocates sequentially', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn().mockResolvedValue({ nonce: 100n, possibleNextNonce: 104n }),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const manager = new NonceManager(nodeClient, new TestLogger());

    const first = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');
    const second = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');

    expect(first).toBe(104n);
    expect(second).toBe(105n);
  });

  it('increments beyond in-flight pending nonces', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi.fn().mockResolvedValue({ nonce: 1n, possibleNextNonce: 2n }),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const manager = new NonceManager(nodeClient, new TestLogger());

    const first = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');
    manager.markPending('0xaaa', first);

    const second = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');
    expect(second).toBe(first + 1n);
  });

  it('resynchronizes on retryable failure after restart or dropped transactions', async () => {
    const nodeClient: TransactionNodeClient = {
      getAddressNonces: vi
        .fn()
        .mockResolvedValueOnce({ nonce: 7n, possibleNextNonce: 8n })
        .mockResolvedValueOnce({ nonce: 9n, possibleNextNonce: 12n }),
      estimateContractCallFee: vi.fn(),
      broadcastSignedTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getCurrentBlockHeight: vi.fn(),
    };

    const manager = new NonceManager(nodeClient, new TestLogger());

    const first = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');
    manager.markPending('0xbbb', first);
    manager.markFailed('0xbbb', true);

    const next = await manager.allocateNonce('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');

    expect(next).toBe(12n);
    expect(nodeClient.getAddressNonces).toHaveBeenCalledTimes(2);
  });
});
