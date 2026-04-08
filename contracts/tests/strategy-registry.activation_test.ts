// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-registry: registrar can deactivate and reactivate strategy',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Reactivation Flow'),
          types.uint(2),
          types.principal(deployer.address),
          types.uint(2),
          types.principal(wallet1.address),
        ],
        deployer.address,
      ),
    ]);

    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const deactivateBlock = chain.mineBlock([
      Tx.contractCall('strategy-registry', 'deactivate-strategy', [types.uint(1)], deployer.address),
    ]);
    deactivateBlock.receipts[0].result.expectOk().expectBool(true);

    const afterDeactivate = chain.callReadOnlyFn('strategy-registry', 'is-strategy-active', [types.uint(1)], deployer.address);
    afterDeactivate.result.expectBool(false);

    const activateBlock = chain.mineBlock([
      Tx.contractCall('strategy-registry', 'activate-strategy', [types.uint(1)], deployer.address),
    ]);
    activateBlock.receipts[0].result.expectOk().expectBool(true);

    const afterActivate = chain.callReadOnlyFn('strategy-registry', 'is-strategy-active', [types.uint(1)], deployer.address);
    afterActivate.result.expectBool(true);
  },
});

Clarinet.test({
  name: 'strategy-registry: non-registrar cannot activate or deactivate',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonRegistrar = accounts.get('wallet_2')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Permissioned State'),
          types.uint(1),
          types.principal(deployer.address),
          types.uint(1),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const deactivateBlock = chain.mineBlock([
      Tx.contractCall('strategy-registry', 'deactivate-strategy', [types.uint(1)], nonRegistrar.address),
    ]);
    deactivateBlock.receipts[0].result.expectErr().expectUint(2203);

    const activateBlock = chain.mineBlock([
      Tx.contractCall('strategy-registry', 'activate-strategy', [types.uint(1)], nonRegistrar.address),
    ]);
    activateBlock.receipts[0].result.expectErr().expectUint(2203);
  },
});

Clarinet.test({
  name: 'strategy-registry: registrar can update strategy metadata fields',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet3 = accounts.get('wallet_3')!;

    const registerBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [
          types.ascii('Metadata V1'),
          types.uint(3),
          types.principal(deployer.address),
          types.uint(1),
          types.principal(deployer.address),
        ],
        deployer.address,
      ),
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    const updateBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'update-strategy-metadata',
        [
          types.uint(1),
          types.ascii('Metadata V2'),
          types.principal(wallet3.address),
          types.uint(3),
          types.principal(wallet3.address),
        ],
        deployer.address,
      ),
    ]);

    updateBlock.receipts[0].result.expectOk().expectBool(true);

    const strategy = chain.callReadOnlyFn('strategy-registry', 'get-strategy-by-id', [types.uint(1)], deployer.address);
    strategy.result.expectSome();
  },
});
