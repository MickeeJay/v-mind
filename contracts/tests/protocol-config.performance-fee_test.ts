import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: 'protocol-config: owner can set performance fee within bounds',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(2000)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(2000);

    const fee = chain.callReadOnlyFn('protocol-config', 'get-protocol-performance-fee-bps', [], deployer.address);
    fee.result.expectUint(2000);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects performance fee above max bound',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(2001)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2101);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot set performance fee',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonOwner = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(1500)], nonOwner.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});

Clarinet.test({
  name: 'protocol-config: config version increments on performance fee update',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const versionBefore = chain.callReadOnlyFn('protocol-config', 'get-config-version', [], deployer.address);
    versionBefore.result.expectUint(1);

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(1700)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(1700);

    const versionAfter = chain.callReadOnlyFn('protocol-config', 'get-config-version', [], deployer.address);
    versionAfter.result.expectUint(2);

    assertEquals(block.receipts.length, 1);
  },
});
