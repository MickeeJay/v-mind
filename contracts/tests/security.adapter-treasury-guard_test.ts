// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: adapter fee collection rejects non-protocol treasury destination',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const attackerTreasury = accounts.get('wallet_8')!;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'collect-zest-fee', [types.uint(10_000), types.principal(attackerTreasury.address)], deployer.address),
      Tx.contractCall('alex-liquidity-adapter', 'collect-alex-fee', [types.uint(10_000), types.principal(attackerTreasury.address)], deployer.address),
      Tx.contractCall('stackingdao-adapter', 'collect-stackingdao-fee', [types.uint(10_000), types.principal(attackerTreasury.address)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'collect-hermetica-fee', [types.uint(10_000), types.principal(attackerTreasury.address)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(3405);
    block.receipts[1].result.expectErr().expectUint(3505);
    block.receipts[2].result.expectErr().expectUint(3605);
    block.receipts[3].result.expectErr().expectUint(3705);
  },
});
