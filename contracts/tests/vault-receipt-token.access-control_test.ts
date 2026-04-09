// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: mint burn and sync are restricted to vault core contract caller',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('vault-receipt-token', 'mint', [types.uint(1), types.principal(deployer.address), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('vault-receipt-token', 'burn', [types.uint(1), types.principal(deployer.address), types.uint(100_000)], deployer.address),
      Tx.contractCall('vault-receipt-token', 'sync-vault-assets', [types.uint(1), types.uint(1_000_000)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2804);
    block.receipts[1].result.expectErr().expectUint(2804);
    block.receipts[2].result.expectErr().expectUint(2804);
  },
});
