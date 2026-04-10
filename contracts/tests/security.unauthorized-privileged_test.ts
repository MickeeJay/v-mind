// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: unauthorized principals cannot call privileged mutating functions',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const attacker = accounts.get('wallet_8')!;

    const block = chain.mineBlock([
      Tx.contractCall('access-control', 'grant-role', [types.principal(attacker.address), types.uint(2)], attacker.address),
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(900)], attacker.address),
      Tx.contractCall('strategy-vault', 'apply-performance-fee', [types.uint(1), types.uint(100_000)], attacker.address),
      Tx.contractCall('strategy-vault', 'set-max-aum-drop-bps-per-tx', [types.uint(500)], attacker.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2000);
    block.receipts[1].result.expectErr().expectUint(2100);
    block.receipts[2].result.expectErr().expectUint(2402);
    block.receipts[3].result.expectErr().expectUint(2402);

    const threshold = chain.callReadOnlyFn('strategy-vault', 'get-max-aum-drop-bps-per-tx', [], deployer.address);
    threshold.result.expectOk().expectUint(10000);
  },
});
