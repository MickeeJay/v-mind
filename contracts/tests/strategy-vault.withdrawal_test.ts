// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'strategy-vault: supports partial and full withdrawal for owner',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(5_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(2_000_000)], deployer.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(3_000_000)], deployer.address),
    ]);

    block.receipts[3].result.expectOk().expectUint(2_000_000);
    block.receipts[4].result.expectOk().expectUint(3_000_000);

    const assets = chain.callReadOnlyFn('strategy-vault', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(0);
  },
});

Clarinet.test({
  name: 'strategy-vault: withdrawal rejects insufficient balance and non-owner callers',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_3')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(3_000_000)], deployer.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(500_000)], nonOwner.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2413);
    block.receipts[4].result.expectErr().expectUint(2401);
  },
});

Clarinet.test({
  name: 'strategy-vault: withdrawal blocked while strategy execution lock is active',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'lock-vault-for-execution', [types.uint(1)], executor.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(500_000)], deployer.address),
    ]);

    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectErr().expectUint(2412);
  },
});
