// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-alex-amm`);
}

Clarinet.test({
  name: 'alex-adapter: routes deposit and withdrawal through ALEX pool interface',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenX = accounts.get('wallet_1')!;
    const tokenY = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'alex-liquidity-adapter',
        'set-alex-config',
        [types.principal(tokenX.address), types.principal(tokenY.address), types.uint(1_000)],
        deployer.address,
      ),
      Tx.contractCall('alex-liquidity-adapter', 'provide-alex-liquidity', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('alex-liquidity-adapter', 'withdraw-alex-liquidity', [types.uint(1), types.uint(400_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectUint(400_000);

    const lpBalance = chain.callReadOnlyFn('alex-liquidity-adapter', 'get-vault-alex-lp-balance', [types.uint(1)], deployer.address);
    const tokenXBalance = chain.callReadOnlyFn('alex-liquidity-adapter', 'get-vault-alex-token-x-balance', [types.uint(1)], deployer.address);

    lpBalance.result.expectOk().expectUint(600_000);
    tokenXBalance.result.expectOk().expectUint(600_000);
  },
});

Clarinet.test({
  name: 'alex-adapter: normalizes external add/remove failures',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenX = accounts.get('wallet_1')!;
    const tokenY = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'alex-liquidity-adapter',
        'set-alex-config',
        [types.principal(tokenX.address), types.principal(tokenY.address), types.uint(1_000)],
        deployer.address,
      ),
      Tx.contractCall('mock-alex-amm', 'set-force-failure', [types.bool(true), types.uint(9_301)], deployer.address),
      Tx.contractCall('alex-liquidity-adapter', 'provide-alex-liquidity', [types.uint(2), types.uint(500_000)], deployer.address),
    ]);

    block.receipts[2].result.expectErr().expectUint(3503);
  },
});

Clarinet.test({
  name: 'alex-adapter: reports LP and primary token tracking for balance reporting',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenX = accounts.get('wallet_1')!;
    const tokenY = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'alex-liquidity-adapter',
        'set-alex-config',
        [types.principal(tokenX.address), types.principal(tokenY.address), types.uint(1_000)],
        deployer.address,
      ),
      Tx.contractCall('alex-liquidity-adapter', 'provide-alex-liquidity', [types.uint(7), types.uint(900_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(900_000);

    const lpBalance = chain.callReadOnlyFn('alex-liquidity-adapter', 'get-vault-alex-lp-balance', [types.uint(7)], deployer.address);
    const tokenXBalance = chain.callReadOnlyFn('alex-liquidity-adapter', 'get-vault-alex-token-x-balance', [types.uint(7)], deployer.address);

    lpBalance.result.expectOk().expectUint(900_000);
    tokenXBalance.result.expectOk().expectUint(900_000);
  },
});
