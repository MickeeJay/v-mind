import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can update treasury principal',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const treasury = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-treasury', [types.principal(treasury.address)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectPrincipal(treasury.address);

    const value = chain.callReadOnlyFn('protocol-config', 'get-protocol-treasury', [], deployer.address);
    value.result.expectPrincipal(treasury.address);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot update treasury principal',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonOwner = accounts.get('wallet_1')!;
    const treasury = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-protocol-treasury', [types.principal(treasury.address)], nonOwner.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});
