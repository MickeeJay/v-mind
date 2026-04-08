// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can set max rebalance frequency in blocks',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(288)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(288);

    const value = chain.callReadOnlyFn(
      'protocol-config',
      'get-max-strategy-rebalance-frequency-blocks',
      [],
      deployer.address,
    );
    value.result.expectUint(288);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects zero rebalance frequency',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(0)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2104);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects rebalance frequency above cap',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(52596)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2104);
  },
});
