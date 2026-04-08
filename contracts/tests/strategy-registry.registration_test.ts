// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-registry: owner can register strategy with valid metadata',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Yield BTC Core'),
          types.uint(1),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(wallet1.address),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);

    const count = chain.callReadOnlyFn('strategy-registry', 'get-total-strategies', [], deployer.address);
    count.result.expectUint(1);

    const active = chain.callReadOnlyFn('strategy-registry', 'is-strategy-active', [types.uint(1)], deployer.address);
    active.result.expectBool(true);
  },
});

Clarinet.test({
  name: 'strategy-registry: non-registrar cannot register strategy',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonRegistrar = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Unauthorized Strategy'),
          types.uint(1),
          types.principal(wallet2.address),
          types.uint(1),
          types.principal(wallet2.address),
        ],
        nonRegistrar.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2203);
  },
});

Clarinet.test({
  name: 'strategy-registry: registration rejects invalid strategy type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Invalid Type Strategy'),
          types.uint(99),
          types.principal(deployer.address),
          types.uint(1),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2204);
  },
});

Clarinet.test({
  name: 'strategy-registry: registration rejects invalid risk tier',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Invalid Risk Strategy'),
          types.uint(2),
          types.principal(deployer.address),
          types.uint(99),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2205);
  },
});
