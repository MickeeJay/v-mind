import { Clarinet, Tx, Chain, Account, types } from './helpers/legacy-clarinet';

Clarinet.test({
  name: 'security: adapters reject production entry points before principal initialization',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(1), types.uint(100_000)], deployer.address),
      Tx.contractCall('alex-liquidity-adapter', 'provide-alex-liquidity', [types.uint(1), types.uint(100_000)], deployer.address),
      Tx.contractCall('stackingdao-adapter', 'mint-ststx', [types.uint(1), types.uint(100_000)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'deposit-usdh', [types.uint(1), types.uint(100_000)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(3408);
    block.receipts[1].result.expectErr().expectUint(3508);
    block.receipts[2].result.expectErr().expectUint(3608);
    block.receipts[3].result.expectErr().expectUint(3708);
  },
});
