// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-core: protocol owner can emergency-withdraw regardless of vault lock/state',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(5_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'pause-vault', [types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'lock-vault-for-execution', [types.uint(1)], executor.address),
      Tx.contractCall('vault-core', 'emergency-withdraw', [types.uint(1)], deployer.address),
    ]);

    block.receipts[3].result.expectOk().expectBool(true);
    block.receipts[4].result.expectErr().expectUint(2411);
    block.receipts[5].result.expectOk().expectUint(5_000_000);

    const assets = chain.callReadOnlyFn('vault-core', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    assets.result.expectOk().expectUint(0);
  },
});

Clarinet.test({
  name: 'vault-core: non protocol-owner cannot emergency-withdraw',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_4')!;
    const protocol = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(protocol.address), types.ascii('STX'), types.uint(1_000_000), types.uint(20_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Yield'), types.uint(1), types.principal(protocol.address), types.uint(1), types.principal(executor.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(protocol.address), types.uint(5_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('vault-core', 'emergency-withdraw', [types.uint(1)], nonOwner.address),
    ]);

    block.receipts[3].result.expectErr().expectUint(2402);
  },
});
