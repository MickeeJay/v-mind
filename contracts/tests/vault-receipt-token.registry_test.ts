// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: vault share registry tracks balances and supply per vault id',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetA = accounts.get('wallet_1')!;
    const assetB = accounts.get('wallet_4')!;
    const executor = accounts.get('wallet_2')!;
    const strategyVaultPrincipal = `${deployer.address}.vault-core`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [types.principal(strategyVaultPrincipal), types.ascii('V-Mind Registry Share'), types.ascii('vREG'), types.uint(6), types.none()],
        deployer.address,
      ),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetA.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetB.address), types.ascii('sBTC'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Vault A Strategy'), types.uint(1), types.principal(assetA.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Vault B Strategy'), types.uint(1), types.principal(assetB.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(assetA.address), types.uint(1_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(assetB.address), types.uint(3_000_000), types.uint(2)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectUint(1);
    block.receipts[6].result.expectOk().expectUint(2);

    chain.callReadOnlyFn('vault-receipt-token', 'get-vault-balance', [types.uint(1), types.principal(deployer.address)], deployer.address).result.expectOk().expectUint(1_000_000);
    chain.callReadOnlyFn('vault-receipt-token', 'get-vault-balance', [types.uint(2), types.principal(deployer.address)], deployer.address).result.expectOk().expectUint(3_000_000);
    chain.callReadOnlyFn('vault-receipt-token', 'get-vault-total-supply', [types.uint(1)], deployer.address).result.expectOk().expectUint(1_000_000);
    chain.callReadOnlyFn('vault-receipt-token', 'get-vault-total-supply', [types.uint(2)], deployer.address).result.expectOk().expectUint(3_000_000);
    chain.callReadOnlyFn('vault-receipt-token', 'get-total-supply', [], deployer.address).result.expectOk().expectUint(4_000_000);
  },
});
