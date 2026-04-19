import { Clarinet, Tx, Chain, Account, types } from './helpers/legacy-clarinet';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-zest-protocol`);
}

function mismatchedConfiguredReserve(account: Account) {
  return types.principal(`${account.address}.mock-alex-amm`);
}

function mockZestConfig(account: Account) {
  const principal = mock(account);
  return [principal, principal, principal, principal, principal];
}

Clarinet.test({
  name: 'zest-adapter: routes deposit and withdrawal through mock zest interface',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const mode = chain.callReadOnlyFn('zest-protocol-adapter', 'get-mock-mode', [], deployer.address);
    mode.result.expectOk().expectBool(false);

    const setup = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'set-zest-config', mockZestConfig(deployer), deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'withdraw-from-zest', [types.uint(1), types.uint(400_000)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[1].result.expectOk().expectUint(1_000_000);
    setup.receipts[2].result.expectOk().expectUint(400_000);

    const position = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-position', [types.uint(1)], deployer.address);
    position.result.expectOk().expectUint(600_000);

    const balance = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(1)], deployer.address);
    balance.result.expectOk().expectUint(600_000);

    const totalDeployed = chain.callReadOnlyFn('zest-protocol-adapter', 'get-total-deployed', [], deployer.address);
    totalDeployed.result.expectOk().expectUint(600_000);
  },
});

Clarinet.test({
  name: 'zest-adapter: normalizes external errors from zest calls',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'set-zest-config', mockZestConfig(deployer), deployer.address),
      Tx.contractCall('mock-zest-protocol', 'set-force-failure', [types.bool(true), types.uint(9_201)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(2), types.uint(250_000)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(3403);
  },
});

Clarinet.test({
  name: 'zest-adapter: reports proportional balances when underlying accrues yield',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const adapterPrincipal = `${deployer.address}.zest-protocol-adapter`;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'set-zest-config', mockZestConfig(deployer), deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'set-mock-mode', [types.bool(true)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(10), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(11), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('mock-zest-protocol', 'set-user-underlying', [types.principal(adapterPrincipal), types.uint(2_400_000)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectUint(1_000_000);
    block.receipts[3].result.expectOk().expectUint(1_000_000);
    block.receipts[4].result.expectOk().expectBool(true);

    const vaultTen = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(10)], deployer.address);
    const vaultEleven = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(11)], deployer.address);

    vaultTen.result.expectOk().expectUint(1_200_000);
    vaultEleven.result.expectOk().expectUint(1_200_000);
  },
});

Clarinet.test({
  name: 'zest-adapter: returns a recoverable error when mock balance reads fail',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const adapterPrincipal = `${deployer.address}.zest-protocol-adapter`;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'set-zest-config', mockZestConfig(deployer), deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'set-mock-mode', [types.bool(true)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'deposit-to-zest', [types.uint(7), types.uint(500_000)], deployer.address),
      Tx.contractCall('mock-zest-protocol', 'set-user-underlying', [types.principal(adapterPrincipal), types.uint(500_000)], deployer.address),
      Tx.contractCall('mock-zest-protocol', 'set-force-failure', [types.bool(true), types.uint(9_201)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectUint(500_000);
    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectOk().expectBool(true);

    const balance = chain.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [types.uint(7)], deployer.address);

    balance.result.expectErr().expectUint(3403);
  },
});

Clarinet.test({
  name: 'zest-adapter: rejects production calls before configuration',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const fee = chain.callReadOnlyFn(
      'zest-protocol-adapter',
      'collect-zest-fee',
      [types.uint(10_000), types.principal(deployer.address)],
      deployer.address,
    );

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'emergency-exit-zest', [types.uint(1)], deployer.address),
    ]);

    fee.result.expectErr().expectUint(3408);
    block.receipts[0].result.expectErr().expectUint(3408);
  },
});

Clarinet.test({
  name: 'zest-adapter: requires owner and configured reserve when syncing live underlying',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const attacker = accounts.get('wallet_7')!;

    const block = chain.mineBlock([
      Tx.contractCall('zest-protocol-adapter', 'set-zest-config', [mismatchedConfiguredReserve(deployer), mock(deployer), mock(deployer), mock(deployer), mock(deployer)], deployer.address),
      Tx.contractCall('zest-protocol-adapter', 'sync-live-zest-underlying-balance', [mock(deployer)], attacker.address),
      Tx.contractCall('zest-protocol-adapter', 'sync-live-zest-underlying-balance', [mock(deployer)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(3400);
    block.receipts[2].result.expectErr().expectUint(3409);
  },
});
