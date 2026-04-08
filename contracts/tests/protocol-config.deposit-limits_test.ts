import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can set minimum deposit',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-minimum-deposit-microstx', [types.uint(500000)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(500000);

    const value = chain.callReadOnlyFn('protocol-config', 'get-minimum-deposit-microstx', [], deployer.address);
    value.result.expectUint(500000);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects zero minimum deposit',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-minimum-deposit-microstx', [types.uint(0)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2103);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects minimum deposit above hard cap',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-minimum-deposit-microstx', [types.uint(1000000000001)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2103);
  },
});
