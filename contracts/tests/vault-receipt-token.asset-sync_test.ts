// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: cached vault assets sync across yield fee and emergency flows',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;
    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const block = chain.mineBlock([
      Tx.contractCall('vault-receipt-token', 'initialize-token', [types.principal(strategyVaultPrincipal), types.ascii('V-Mind Sync Share'), types.ascii('vSYNC'), types.uint(6), types.none()], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Sync Strategy'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'accrue-yield', [types.uint(1), types.uint(300_000)], deployer.address),
      Tx.contractCall('strategy-vault', 'apply-performance-fee', [types.uint(1), types.uint(100_000)], deployer.address),
      Tx.contractCall('strategy-vault', 'emergency-withdraw', [types.uint(1)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectUint(2_300_000);
    block.receipts[5].result.expectOk().expectUint(2_200_000);
    block.receipts[6].result.expectOk().expectUint(2_200_000);

    chain.callReadOnlyFn('vault-receipt-token', 'get-vault-total-assets', [types.uint(1)], deployer.address).result.expectOk().expectUint(0);
  },
});
