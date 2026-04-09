// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

const PROTOCOL_ZEST = 1;

function mockAdapter(account: Account) {
  return types.principal(`${account.address}.mock-defi-integrations`);
}

function mineBlocks(chain: Chain, count: number) {
  for (let i = 0; i < count; i++) {
    chain.mineBlock([]);
  }
}

Clarinet.test({
  name: 'strategy-execution: full execution flow with fee collection, cooldown, partial withdrawal, and full emergency exit',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(1)], deployer.address),
      Tx.contractCall('protocol-config', 'set-protocol-performance-fee-bps', [types.uint(1000)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Execution Engine Flow'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(8_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectUint(1);
    setup.receipts[1].result.expectOk().expectUint(1000);
    setup.receipts[3].result.expectOk().expectUint(1);
    setup.receipts[4].result.expectOk().expectUint(1);

    const firstExecution = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(1_000_000),
          types.uint(200_000),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);

    firstExecution.receipts[0].result.expectOk();

    const cooldownBlock = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(500_000),
          types.uint(100_000),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);

    cooldownBlock.receipts[0].result.expectErr().expectUint(2606);

    mineBlocks(chain, 1);

    const secondExecution = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(500_000),
          types.uint(100_000),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall(
        'strategy-execution',
        'emergency-exit-vault',
        [types.uint(1), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer), mockAdapter(deployer)],
        deployer.address,
      ),
    ]);

    secondExecution.receipts[0].result.expectOk();
    secondExecution.receipts[1].result.expectOk().expectUint(1_000_000);
    secondExecution.receipts[2].result.expectOk();

    const execState = chain.callReadOnlyFn('strategy-execution', 'get-vault-execution-state', [types.uint(1)], deployer.address);
    execState.result.expectSome();

    const feeState = chain.callReadOnlyFn('mock-defi-integrations', 'get-total-fees-collected', [], deployer.address);
    feeState.result.expectOk().expectUint(30_000);

    const feeTracker = chain.callReadOnlyFn('strategy-execution', 'get-vault-fees-collected', [types.uint(1)], deployer.address);
    feeTracker.result.expectOk().expectUint(30_000);

    const position = chain.callReadOnlyFn('strategy-execution', 'get-vault-position', [types.uint(1), types.uint(PROTOCOL_ZEST)], deployer.address);
    position.result.expectSome();
  },
});

Clarinet.test({
  name: 'strategy-execution: non-owner without executor role cannot execute strategy',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const unauthorized = accounts.get('wallet_6')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(1)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Unauthorized Executor'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(8_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[3].result.expectOk().expectUint(1);

    const block = chain.mineBlock([
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
        unauthorized.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2600);
  },
});
