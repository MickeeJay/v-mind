// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: transfer requires single-vault context for sender',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const recipient = accounts.get('wallet_3')!;
    const assetA = accounts.get('wallet_1')!;
    const assetB = accounts.get('wallet_4')!;
    const executor = accounts.get('wallet_2')!;
    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const block = chain.mineBlock([
      Tx.contractCall('vault-receipt-token', 'initialize-token', [types.principal(strategyVaultPrincipal), types.ascii('V-Mind Context Share'), types.ascii('vCTX'), types.uint(6), types.none()], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetA.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetB.address), types.ascii('sBTC'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Context Strategy A'), types.uint(1), types.principal(assetA.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Context Strategy B'), types.uint(1), types.principal(assetB.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(assetA.address), types.uint(1_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(assetB.address), types.uint(1_000_000), types.uint(2)], deployer.address),
      Tx.contractCall('vault-receipt-token', 'transfer', [types.uint(100_000), types.principal(deployer.address), types.principal(recipient.address), types.none()], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectUint(1);
    block.receipts[6].result.expectOk().expectUint(2);
    block.receipts[7].result.expectErr().expectUint(2807);
  },
});
