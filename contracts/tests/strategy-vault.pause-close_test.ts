// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-core: owner can pause and unpause vault, non-owner cannot pause',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_3')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'pause-vault', [types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'pause-vault', [types.uint(1)], nonOwner.address),
      Tx.contractCall('vault-core', 'unpause-vault', [types.uint(1)], deployer.address),
    ]);

    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectErr().expectUint(2401);
    block.receipts[5].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'vault-core: close requires zero balance and marks vault closed',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(10_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'close-vault', [types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'withdraw', [types.uint(1), types.uint(2_000_000)], deployer.address),
      Tx.contractCall('vault-core', 'close-vault', [types.uint(1)], deployer.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2415);
    block.receipts[4].result.expectOk().expectUint(2_000_000);
    block.receipts[5].result.expectOk().expectBool(true);

    const status = chain.callReadOnlyFn('vault-core', 'get-vault-status', [types.uint(1)], deployer.address);
    status.result.expectOk().expectUint(3);
  },
});
