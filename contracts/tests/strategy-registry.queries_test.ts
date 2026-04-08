// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-registry: list-strategies-by-type returns ids grouped by type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Type Yield One'),
          types.uint(1),
          types.principal(deployer.address),
          types.uint(1),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Type Rebalance One'),
          types.uint(2),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Type Yield Two'),
          types.uint(1),
          types.principal(deployer.address),
          types.uint(3),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);
    block.receipts[2].result.expectOk().expectUint(3);

    const yieldIds = chain.callReadOnlyFn(
      'strategy-registry',
      'list-strategies-by-type',
      [types.uint(1)],
      deployer.address,
    );
    yieldIds.result.expectList().expectUint(1).expectUint(3);

    const rebalanceIds = chain.callReadOnlyFn(
      'strategy-registry',
      'list-strategies-by-type',
      [types.uint(2)],
      deployer.address,
    );
    rebalanceIds.result.expectList().expectUint(2);
  },
});

Clarinet.test({
  name: 'strategy-registry: get-total-strategies and strategy lookup stay consistent',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Lookup Consistency'),
          types.uint(3),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const count = chain.callReadOnlyFn('strategy-registry', 'get-total-strategies', [], deployer.address);
    count.result.expectUint(1);

    const existing = chain.callReadOnlyFn('strategy-registry', 'get-strategy-by-id', [types.uint(1)], deployer.address);
    existing.result.expectSome();

    const missing = chain.callReadOnlyFn('strategy-registry', 'get-strategy-by-id', [types.uint(99)], deployer.address);
    missing.result.expectNone();
  },
});
