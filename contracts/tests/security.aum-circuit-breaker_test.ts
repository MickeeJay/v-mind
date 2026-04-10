// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: AUM circuit breaker rejects excessive single-tx asset drop',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Circuit Breaker'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(10_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'set-max-aum-drop-bps-per-tx', [types.uint(500)], deployer.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);
    setup.receipts[3].result.expectOk().expectUint(500);

    const excessiveFee = chain.mineBlock([
      Tx.contractCall('strategy-vault', 'apply-performance-fee', [types.uint(1), types.uint(1_000_000)], deployer.address),
    ]);

    excessiveFee.receipts[0].result.expectErr().expectUint(2419);

    const safeFee = chain.mineBlock([
      Tx.contractCall('strategy-vault', 'apply-performance-fee', [types.uint(1), types.uint(400_000)], deployer.address),
    ]);

    safeFee.receipts[0].result.expectOk().expectUint(9_600_000);
  },
});
