// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-vault: owner can deposit into active vault with matching asset',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'deposit', [types.uint(1), types.principal(protocol.address), types.uint(1_000_000)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk();
    setup.receipts[1].result.expectOk().expectUint(1);
    setup.receipts[2].result.expectOk().expectUint(1);
    setup.receipts[3].result.expectOk().expectUint(3_000_000);
  },
});

Clarinet.test({
  name: 'strategy-vault: non-owner cannot deposit',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_3')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'deposit', [types.uint(1), types.principal(protocol.address), types.uint(1_000_000)], nonOwner.address),
    ]);

    setup.receipts[3].result.expectErr().expectUint(2401);
  },
});

Clarinet.test({
  name: 'strategy-vault: paused vault rejects new deposits',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'pause-vault', [types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'deposit', [types.uint(1), types.principal(protocol.address), types.uint(1_000_000)], deployer.address),
    ]);

    block.receipts[4].result.expectErr().expectUint(2411);
  },
});

Clarinet.test({
  name: 'strategy-vault: deposit requires same configured asset type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetA = accounts.get('wallet_1')!;
    const assetB = accounts.get('wallet_4')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetA.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(assetB.address), types.ascii('ALEX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(assetA.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(assetA.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'deposit', [types.uint(1), types.principal(assetB.address), types.uint(1_000_000)], deployer.address),
    ]);

    block.receipts[4].result.expectErr().expectUint(2406);
  },
});
