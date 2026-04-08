// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can set and remove fee override',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const setBlock = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'set-fee-override',
        [types.ascii('tier-high'), types.uint(1800)],
        deployer.address,
      ),
    ]);

    setBlock.receipts[0].result.expectOk().expectBool(true);

    const overrideValue = chain.callReadOnlyFn(
      'protocol-config',
      'get-fee-override',
      [types.ascii('tier-high')],
      deployer.address,
    );
    overrideValue.result.expectSome();

    const removeBlock = chain.mineBlock([
      Tx.contractCall('protocol-config', 'remove-fee-override', [types.ascii('tier-high')], deployer.address),
    ]);

    removeBlock.receipts[0].result.expectOk().expectBool(true);

    const removed = chain.callReadOnlyFn(
      'protocol-config',
      'get-fee-override',
      [types.ascii('tier-high')],
      deployer.address,
    );
    removed.result.expectNone();
  },
});

Clarinet.test({
  name: 'protocol-config: rejects fee override above global cap',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'set-fee-override',
        [types.ascii('tier-over'), types.uint(2001)],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2101);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot remove fee override',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'set-fee-override',
        [types.ascii('tier-mid'), types.uint(1200)],
        deployer.address,
      ),
    ]);
    setup.receipts[0].result.expectOk().expectBool(true);

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'remove-fee-override', [types.ascii('tier-mid')], nonOwner.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});
