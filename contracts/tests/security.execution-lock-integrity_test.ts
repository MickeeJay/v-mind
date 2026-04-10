// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

const PROTOCOL_ZEST = 1;

function mockAdapter(account: Account) {
  return types.principal(`${account.address}.mock-defi-integrations`);
}

Clarinet.test({
  name: 'security: execution lock is released after successful strategy execution',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(1)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Lock Integrity'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(8_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[3].result.expectOk().expectUint(1);

    const exec = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(500_000),
          types.uint(0),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);

    exec.receipts[0].result.expectOk();

    const locked = chain.callReadOnlyFn('strategy-vault', 'is-vault-locked', [types.uint(1)], deployer.address);
    locked.result.expectOk().expectBool(false);
  },
});
