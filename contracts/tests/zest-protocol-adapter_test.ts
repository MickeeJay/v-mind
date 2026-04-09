// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-zest-protocol`);
}

Clarinet.test({
  name: 'zest-adapter: routes deposit and withdrawal through mock zest interface',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const setup = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'withdraw-from-zest', [types.uint(1), types.uint(400_000)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectUint(1_000_000);
    setup.receipts[1].result.expectOk().expectUint(400_000);

    const position = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-position', [types.uint(1)], deployer.address);
    position.result.expectOk().expectUint(600_000);

    const balance = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(1)], deployer.address);
    balance.result.expectOk().expectUint(600_000);

    const mode = chain.callReadOnlyFn('zest-protocol-adapter', 'get-mock-mode', [], deployer.address);
    mode.result.expectOk().expectBool(true);

    const totalDeployed = chain.callReadOnlyFn('zest-protocol-adapter', 'get-total-deployed', [], deployer.address);
    totalDeployed.result.expectOk().expectUint(600_000);
  },
});

Clarinet.test({
  name: 'zest-adapter: normalizes external errors from zest calls',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('mock-zest-protocol', 'set-force-failure', [types.bool(true), types.uint(9_201)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(2), types.uint(250_000)], deployer.address),
    ]);

    block.receipts[1].result.expectErr().expectUint(3403);
  },
});

Clarinet.test({
  name: 'zest-adapter: reports proportional balances when underlying accrues yield',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const adapterPrincipal = `${deployer.address}.zest-protocol-adapter`;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(10), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(11), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('mock-zest-protocol', 'set-user-underlying', [types.principal(adapterPrincipal), types.uint(2_400_000)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(1_000_000);
    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectBool(true);

    const vaultTen = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(10)], deployer.address);
    const vaultEleven = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(11)], deployer.address);

    vaultTen.result.expectOk().expectUint(1_200_000);
    vaultEleven.result.expectOk().expectUint(1_200_000);
  },
});
