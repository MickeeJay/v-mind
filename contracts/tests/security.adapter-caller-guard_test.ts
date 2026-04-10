// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'security: adapters reject direct calls from unauthorized principals',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const attacker = accounts.get('wallet_7')!;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(1), types.uint(100_000)], attacker.address),
      Tx.contractCall('alex-liquidity-adapter', 'provide-alex-liquidity', [types.uint(1), types.uint(100_000)], attacker.address),
      Tx.contractCall('stackingdao-adapter', 'mint-ststx', [types.uint(1), types.uint(100_000)], attacker.address),
      Tx.contractCall('hermetica-adapter', 'deposit-usdh', [types.uint(1), types.uint(100_000)], attacker.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(3404);
    block.receipts[1].result.expectErr().expectUint(3504);
    block.receipts[2].result.expectErr().expectUint(3604);
    block.receipts[3].result.expectErr().expectUint(3704);
  },
});
