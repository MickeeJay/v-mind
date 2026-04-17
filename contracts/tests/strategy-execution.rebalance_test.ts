import { Clarinet, Tx, Chain, Account, types } from './helpers/legacy-clarinet';

const PROTOCOL_ZEST = 1;
const PROTOCOL_ALEX = 2;

function mockAdapter(account: Account) {
  return types.principal(`${account.address}.mock-defi-integrations`);
}

Clarinet.test({
  name: 'strategy-execution: rebalance shifts allocation between strategy legs',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(1)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Rebalance Flow'), types.uint(2), types.principal(asset.address), types.uint(2), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(asset.address), types.uint(10_000_000), types.uint(1)], deployer.address),
    ]);

    setup.receipts[2].result.expectOk().expectUint(1);

    const seed = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(2_000_000),
          types.uint(0),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);
    seed.receipts[0].result.expectOk();

    const rebalance = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'rebalance-vault',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(PROTOCOL_ALEX),
          types.uint(1_250_000),
          types.list([
            types.tuple({ 'protocol-id': types.uint(PROTOCOL_ZEST), 'target-bps': types.uint(4000) }),
            types.tuple({ 'protocol-id': types.uint(PROTOCOL_ALEX), 'target-bps': types.uint(6000) }),
          ]),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);

    rebalance.receipts[0].result.expectOk().expectUint(1_250_000);

    const zestPosition = chain.callReadOnlyFn('strategy-execution', 'get-protocol-position', [types.uint(1), types.uint(PROTOCOL_ZEST)], deployer.address);
    const alexPosition = chain.callReadOnlyFn('strategy-execution', 'get-protocol-position', [types.uint(1), types.uint(PROTOCOL_ALEX)], deployer.address);
    const totalAllocated = chain.callReadOnlyFn('strategy-execution', 'get-vault-total-allocated', [types.uint(1)], deployer.address);

    zestPosition.result.expectOk();
    alexPosition.result.expectOk();
    totalAllocated.result.expectOk().expectUint(2_000_000);
  },
});

Clarinet.test({
  name: 'strategy-execution: rebalance is atomic and reverts if any leg fails',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;

    const setup = chain.mineBlock([
      Tx.contractCall('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [types.uint(1)], deployer.address),
      Tx.contractCall('protocol-config', 'add-supported-asset', [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)], deployer.address),
      Tx.contractCall('strategy-registry', 'register-strategy', [types.ascii('Atomic Rebalance'), types.uint(2), types.principal(asset.address), types.uint(2), types.principal(deployer.address)], deployer.address),
      Tx.contractCall('vault-core', 'create-vault', [types.principal(asset.address), types.uint(10_000_000), types.uint(1)], deployer.address),
      Tx.contractCall(
        'strategy-execution',
        'execute-strategy',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(1_500_000),
          types.uint(0),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
      Tx.contractCall('mock-defi-integrations', 'set-force-failure', [types.bool(true)], deployer.address),
    ]);

    setup.receipts[4].result.expectOk();
    setup.receipts[5].result.expectOk().expectBool(true);

    const failed = chain.mineBlock([
      Tx.contractCall(
        'strategy-execution',
        'rebalance-vault',
        [
          types.uint(1),
          types.uint(1),
          types.uint(PROTOCOL_ZEST),
          types.uint(PROTOCOL_ALEX),
          types.uint(500_000),
          types.list([
            types.tuple({ 'protocol-id': types.uint(PROTOCOL_ZEST), 'target-bps': types.uint(5000) }),
            types.tuple({ 'protocol-id': types.uint(PROTOCOL_ALEX), 'target-bps': types.uint(5000) }),
          ]),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
          mockAdapter(deployer),
        ],
        deployer.address,
      ),
    ]);

    failed.receipts[0].result.expectErr().expectUint(3301);
  },
});
