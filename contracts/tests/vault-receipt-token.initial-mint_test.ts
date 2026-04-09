// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: first deposit mints initial shares at 1.0 price-per-share',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [
          types.principal(strategyVaultPrincipal),
          types.ascii('V-Mind Vault Share'),
          types.ascii('vSHARE'),
          types.uint(6),
          types.some(types.utf8('https://v-mind.xyz/token/vshare')),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('Vault Yield'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(2_000_000), types.uint(1)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk().expectUint(1);
    block.receipts[3].result.expectOk().expectUint(1);

    const vaultShares = chain.callReadOnlyFn('strategy-vault', 'get-vault-share-balance', [types.uint(1), types.principal(deployer.address)], deployer.address);
    vaultShares.result.expectOk().expectUint(2_000_000);

    const totalSupply = chain.callReadOnlyFn('vault-receipt-token', 'get-total-supply', [], deployer.address);
    totalSupply.result.expectOk().expectUint(2_000_000);

    const price = chain.callReadOnlyFn('strategy-vault', 'get-vault-price-per-share', [types.uint(1)], deployer.address);
    price.result.expectOk().expectUint(1_000_000);
  },
});
