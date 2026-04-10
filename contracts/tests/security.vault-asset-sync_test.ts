// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: vault-core and receipt-token asset accounting stay synchronized',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Asset Sync'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(asset.address), types.uint(4_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'deposit', [types.uint(1), types.principal(asset.address), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(1_500_000)], deployer.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);
    setup.receipts[3].result.expectOk().expectUint(5_000_000);
    setup.receipts[4].result.expectOk();

    const vaultAssets = chain.callReadOnlyFn('vault-core', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    const receiptAssets = chain.callReadOnlyFn('vault-receipt-token', 'get-vault-total-assets', [types.uint(1)], deployer.address);

    vaultAssets.result.expectOk().expectUint(3_500_000);
    receiptAssets.result.expectOk().expectUint(3_500_000);
  },
});
