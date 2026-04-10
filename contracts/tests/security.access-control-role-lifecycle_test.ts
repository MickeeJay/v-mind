// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: access-control role lifecycle enforces owner grants and self-renounce',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('deployer')!;
    const actor = accounts.get('wallet_3')!;

    const block = chain.mineBlock([
      Tx.contractCall('access-control', 'grant-role', [types.principal(actor.address), types.uint(2)], owner.address),
      Tx.contractCall('access-control', 'revoke-role', [types.principal(actor.address), types.uint(2)], owner.address),
      Tx.contractCall('access-control', 'grant-role', [types.principal(actor.address), types.uint(3)], owner.address),
      Tx.contractCall('access-control', 'renounce-role', [types.uint(3)], actor.address),
      Tx.contractCall('access-control', 'grant-role', [types.principal(actor.address), types.uint(99)], owner.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectErr().expectUint(2001);

    const hasRole2 = chain.callReadOnlyFn('access-control', 'has-role', [types.principal(actor.address), types.uint(2)], owner.address);
    const hasRole3 = chain.callReadOnlyFn('access-control', 'has-role', [types.principal(actor.address), types.uint(3)], owner.address);
    hasRole2.result.expectBool(false);
    hasRole3.result.expectBool(false);
  },
});
