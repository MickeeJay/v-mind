// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-core invariant: balance never becomes negative on over-withdraw',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(3_000_000)], deployer.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2413);

    const assets = chain.callReadOnlyFn('vault-core', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(2_000_000);
  },
});

Clarinet.test({
  name: 'vault-core invariant: only owner can withdraw from vault',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const attacker = accounts.get('wallet_5')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(1_000_000)], attacker.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2401);

    const assets = chain.callReadOnlyFn('vault-core', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(2_000_000);
  },
});

Clarinet.test({
  name: 'vault-core invariant: closed vault cannot receive deposits',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(2_000_000)], deployer.address),
      Tx.contractCall('vault-core', 'close-vault', [types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'deposit', [types.uint(1), types.principal(protocol.address), types.uint(1_000_000)], deployer.address),
    ]);

    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectErr().expectUint(2411);
  },
});

Clarinet.test({
  name: 'vault-core invariant: cumulative deposits cannot exceed configured asset max',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(3_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'deposit', [types.uint(1), types.principal(protocol.address), types.uint(2_000_000)], deployer.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2408);
  },
});
