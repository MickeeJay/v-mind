// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-vault: create-vault succeeds with supported asset and active strategy',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('Yield Strategy'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk();
    setup.receipts[1].result.expectOk().expectUint(1);
    setup.receipts[2].result.expectOk().expectUint(1);

    const status = chain.callReadOnlyFn('strategy-vault', 'get-vault-status', [types.uint(1)], deployer.address);
    status.result.expectOk().expectUint(1);

    const assets = chain.callReadOnlyFn('strategy-vault', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(2_000_000);

    const nextId = chain.callReadOnlyFn('strategy-vault', 'get-next-vault-id', [], deployer.address);
    nextId.result.expectUint(2);
  },
});

Clarinet.test({
  name: 'strategy-vault: create-vault rejects unsupported asset',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;
    const unsupported = accounts.get('wallet_3')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('Yield Strategy'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(unsupported.address), types.uint(2_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectUint(1);
    setup.receipts[1].result.expectErr().expectUint(2404);
  },
});

Clarinet.test({
  name: 'strategy-vault: create-vault rejects deposit below threshold',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [types.principal(protocol.address), types.ascii('sBTC'), types.uint(2_000_000), types.uint(10_000_000)],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('Rebalance Strategy'), types.uint(2), types.principal(protocol.address), types.uint(2), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(1_500_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk();
    setup.receipts[1].result.expectOk().expectUint(1);
    setup.receipts[2].result.expectErr().expectUint(2407);
  },
});

Clarinet.test({
  name: 'strategy-vault: create-vault rejects missing or inactive strategy',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [types.principal(protocol.address), types.ascii('ALEX'), types.uint(1_000_000), types.uint(10_000_000)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(99)], deployer.address),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('DCA Strategy'), types.uint(3), types.principal(protocol.address), types.uint(2), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-registry', 'deactivate-strategy', [types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk();
    setup.receipts[1].result.expectErr().expectUint(2409);
    setup.receipts[2].result.expectOk().expectUint(1);
    setup.receipts[3].result.expectOk().expectBool(true);
    setup.receipts[4].result.expectErr().expectUint(2410);
  },
});
