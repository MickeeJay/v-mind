// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-stackingdao-core`);
}

Clarinet.test({
  name: 'stackingdao-adapter: routes mint and redeem flows through core interface',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'stackingdao-adapter',
        'set-stackingdao-config',
        [mock(deployer), mock(deployer), mock(deployer), mock(deployer), mock(deployer)],
        deployer.address,
      ),
      Tx.contractCall('stackingdao-adapter', 'mint-ststx', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('stackingdao-adapter', 'redeem-ststx', [types.uint(1), types.uint(400_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectUint(400_000);

    const shares = chain.callReadOnlyFn('stackingdao-adapter', 'get-vault-ststx-shares', [types.uint(1)], deployer.address);
    shares.result.expectOk().expectUint(600_000);
  },
});

Clarinet.test({
  name: 'stackingdao-adapter: normalizes external errors from stackingdao contracts',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'stackingdao-adapter',
        'set-stackingdao-config',
        [mock(deployer), mock(deployer), mock(deployer), mock(deployer), mock(deployer)],
        deployer.address,
      ),
      Tx.contractCall('mock-stackingdao-core', 'set-force-failure', [types.bool(true), types.uint(9_401)], deployer.address),
      Tx.contractCall('stackingdao-adapter', 'mint-ststx', [types.uint(2), types.uint(200_000)], deployer.address),
    ]);

    block.receipts[2].result.expectErr().expectUint(3603);
  },
});

Clarinet.test({
  name: 'stackingdao-adapter: reports STX balances using exchange-rate aware accounting',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall(
        'stackingdao-adapter',
        'set-stackingdao-config',
        [mock(deployer), mock(deployer), mock(deployer), mock(deployer), mock(deployer)],
        deployer.address,
      ),
      Tx.contractCall('stackingdao-adapter', 'mint-ststx', [types.uint(9), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('stackingdao-adapter', 'redeem-ststx', [types.uint(9), types.uint(400_000)], deployer.address),
      Tx.contractCall('mock-stackingdao-core', 'set-exchange-rate', [types.uint(120_000_000)], deployer.address),
    ]);

    block.receipts[1].result.expectOk().expectUint(1_000_000);
    block.receipts[2].result.expectOk().expectUint(400_000);

    const balance = chain.callReadOnlyFn('stackingdao-adapter', 'get-vault-stx-balance', [types.uint(9)], deployer.address);
    balance.result.expectOk().expectUint(720_000);
  },
});
