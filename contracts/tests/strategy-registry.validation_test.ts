// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-registry: validate-strategy-execution succeeds for active strategy and authorized executor',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const executor = accounts.get('wallet_1')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Executor Match'),
          types.uint(1),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(executor.address),
        ],
        deployer.address,
      ),
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const validation = chain.callReadOnlyFn(
      'strategy-registry',
      'validate-strategy-execution',
      [types.uint(1)],
      executor.address,
    );

    validation.result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'strategy-registry: validate-strategy-execution fails when strategy is inactive',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const executor = accounts.get('wallet_1')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Inactive Validation'),
          types.uint(2),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(executor.address),
        ],
        deployer.address,
      ),
      Tx.contractCall('strategy-registry', 'deactivate-strategy', [types.uint(1)], deployer.address),
    ]);

    registerBlock.receipts[0].result.expectOk().expectUint(1);
    registerBlock.receipts[1].result.expectOk().expectBool(true);

    const validation = chain.callReadOnlyFn(
      'strategy-registry',
      'validate-strategy-execution',
      [types.uint(1)],
      executor.address,
    );

    validation.result.expectErr().expectUint(2208);
  },
});

Clarinet.test({
  name: 'strategy-registry: validate-strategy-execution fails for unauthorized executor',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const executor = accounts.get('wallet_1')!;
    const attacker = accounts.get('wallet_2')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Executor Guard'),
          types.uint(4),
          types.principal(deployer.address),
          types.uint(1),
          types.principal(executor.address),
        ],
        deployer.address,
      ),
    ]);

    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const validation = chain.callReadOnlyFn(
      'strategy-registry',
      'validate-strategy-execution',
      [types.uint(1)],
      attacker.address,
    );

    validation.result.expectErr().expectUint(2209);
  },
});

Clarinet.test({
  name: 'strategy-registry: validate-strategy-execution fails when strategy id is missing',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const caller = accounts.get('wallet_1')!;

    const validation = chain.callReadOnlyFn(
      'strategy-registry',
      'validate-strategy-execution',
      [types.uint(999)],
      caller.address,
    );

    validation.result.expectErr().expectUint(2202);
  },
});
