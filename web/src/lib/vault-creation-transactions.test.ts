import { describe, expect, it } from 'vitest';

import {
  VaultTransactionError,
  classifyVaultTransactionError,
  getExplorerTxUrl,
} from '@/lib/vault-creation-transactions';

describe('vault creation transaction helpers', () => {
  it('builds explorer links with chain query', () => {
    expect(getExplorerTxUrl('0xabc123')).toContain('/txid/0xabc123');
    expect(getExplorerTxUrl('0xabc123')).toContain('chain=testnet');
  });

  it('preserves classified transaction errors', () => {
    const error = new VaultTransactionError('network-error', 'network down');
    expect(classifyVaultTransactionError(error)).toBe(error);
  });

  it('maps wallet rejection messages into wallet-rejection kind', () => {
    const classified = classifyVaultTransactionError(new Error('User rejected transaction'));
    expect(classified.kind).toBe('wallet-rejection');
  });
});
