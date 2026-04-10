// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: attacker cannot drain another user vault',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('deployer')!;
    const attacker = accounts.get('wallet_9')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], owner.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Drain Guard'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(owner.address)], owner.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(3_000_000), types.uint(1)], owner.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);

    const attack = chain.mineBlock([
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(1_000_000)], attacker.address),
    ]);

    attack.receipts[0].result.expectErr().expectUint(2401);

    const vaultAssets = chain.callReadOnlyFn('strategy-vault', 'get-vault-total-assets', [types.uint(1)], owner.address);
    vaultAssets.result.expectOk().expectUint(3_000_000);
  },
});
