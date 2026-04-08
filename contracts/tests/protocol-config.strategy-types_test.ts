// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can whitelist and remove strategy type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const addBlock = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-whitelisted-strategy-type', [types.ascii('delta-neutral')], deployer.address),
    ]);
    addBlock.receipts[0].result.expectOk().expectBool(true);

    const value = chain.callReadOnlyFn(
      'protocol-config',
      'get-whitelisted-strategy-type',
      [types.ascii('delta-neutral')],
      deployer.address,
    );
    value.result.expectSome();

    const removeBlock = chain.mineBlock([
      Tx.contractCall('protocol-config', 'remove-whitelisted-strategy-type', [types.ascii('delta-neutral')], deployer.address),
    ]);
    removeBlock.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot whitelist strategy type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonOwner = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-whitelisted-strategy-type', [types.ascii('carry')], nonOwner.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});

Clarinet.test({
  name: 'protocol-config: removing missing strategy type returns expected error',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'remove-whitelisted-strategy-type', [types.ascii('missing')], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2112);
  },
});
