// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: withdrawing more than deposited fails and preserves vault assets',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Security Withdraw Guard'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(asset.address), types.uint(2_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);

    const attack = chain.mineBlock([
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(3_000_000)], deployer.address),
    ]);

    attack.receipts[0].result.expectErr().expectUint(2413);

    const assets = chain.callReadOnlyFn('vault-core', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(2_000_000);
  },
});
