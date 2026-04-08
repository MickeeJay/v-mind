import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: set-supported-asset-active on missing asset returns err-asset-not-supported',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const missingAsset = `${deployer.address}.missing-asset`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'set-supported-asset-active',
        [types.principal(missingAsset), types.bool(true)],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2108);
  },
});

Clarinet.test({
  name: 'protocol-config: remove-fee-override on missing key returns err-override-not-found',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'remove-fee-override', [types.ascii('unknown-tier')], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2110);
  },
});

Clarinet.test({
  name: 'protocol-config: blank fee override key returns err-invalid-override-key',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-fee-override', [types.ascii(''), types.uint(500)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(2109);
  },
});
