// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

const PROTOCOL_ZEST = 1;

function mockAdapter(account: Account) {
  return types.principal(`${account.address}.mock-defi-integrations`);
}

Clarinet.test({
  name: 'strategy-execution: emergency exit bypasses cooldown and can only be called by protocol owner',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const nonOwner = accounts.get('wallet_5')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(200)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Emergency Exit'), types.uint(4), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(asset.address), types.uint(10_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);

    const seeded = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(2_000_000),
          types.uint(100_000),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-execution',
        'emergency-exit-vault',
        [types.uint(1), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer)],
        nonOwner.address,
      ),
      Tx.contractCall(
        'strategy-execution',
        'emergency-exit-vault',
        [types.uint(1), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer)],
        deployer.address,
      ),
    ]);

    seeded.receipts[0].result.expectOk();
    seeded.receipts[1].result.expectErr().expectUint(2601);
    seeded.receipts[2].result.expectOk();

    const nextExecutionBlock = chain.callReadOnlyFn('strategy-execution', 'get-next-executable-block', [types.uint(1)], deployer.address);
    nextExecutionBlock.result.expectOk();

    const position = chain.callReadOnlyFn('strategy-execution', 'get-vault-position', [types.uint(1), types.uint(PROTOCOL_ZEST)], deployer.address);
    position.result.expectSome();
  },
});
