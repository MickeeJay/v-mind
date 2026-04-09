// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-hermetica-staking`);
}

Clarinet.test({
  name: 'hermetica-adapter: routes stake and unstake calls successfully',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [mock(deployer), mock(deployer)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'deposit-usdh', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'withdraw-usdh', [types.uint(1), types.uint(250_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectUint(250_000);

    const shares = chain.callReadOnlyFn('hermetica-adapter', 'get-vault-susdh-shares', [types.uint(1)], deployer.address);
    shares.result.expectOk().expectUint(750_000);
  },
});

Clarinet.test({
  name: 'hermetica-adapter: normalizes external staking errors',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [mock(deployer), mock(deployer)], deployer.address),
      Tx.contractCall('mock-hermetica-staking', 'set-force-failure', [types.bool(true), types.uint(9_501)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'deposit-usdh', [types.uint(2), types.uint(100_000)], deployer.address),
    ]);

    block.receipts[2].result.expectErr().expectUint(3703);
  },
});

Clarinet.test({
  name: 'hermetica-adapter: reports USDh balances using yield accrual exchange rate',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [mock(deployer), mock(deployer)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'deposit-usdh', [types.uint(8), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'withdraw-usdh', [types.uint(8), types.uint(250_000)], deployer.address),
      Tx.contractCall('mock-hermetica-staking', 'set-usdh-per-susdh', [types.uint(130_000_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectUint(250_000);

    const rate = chain.callReadOnlyFn('hermetica-adapter', 'get-usdh-per-susdh-rate', [], deployer.address);
    rate.result.expectOk().expectUint(130_000_000);

    const balance = chain.callReadOnlyFn('hermetica-adapter', 'get-vault-usdh-balance', [types.uint(8)], deployer.address);
    balance.result.expectOk().expectUint(975_000);
  },
});
