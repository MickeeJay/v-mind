import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can set max active vaults per user',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-active-vaults-per-user', [types.uint(25)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(25);

    const value = chain.callReadOnlyFn('protocol-config', 'get-max-active-vaults-per-user', [], deployer.address);
    value.result.expectUint(25);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects zero max active vaults',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-active-vaults-per-user', [types.uint(0)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2102);
  },
});

Clarinet.test({
  name: 'protocol-config: rejects max active vaults above hard cap',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-active-vaults-per-user', [types.uint(201)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2102);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot update max active vaults',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonOwner = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-active-vaults-per-user', [types.uint(15)], nonOwner.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});
