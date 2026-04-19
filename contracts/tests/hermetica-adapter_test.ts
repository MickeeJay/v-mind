import { Clarinet, Tx, Chain, Account, types } from './helpers/legacy-clarinet';

function mock(account: Account) {
  return types.principal(`${account.address}.mock-hermetica-staking`);
}

function hermeticaMainnet() {
  return types.principal('SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.staking-v1-1');
}

Clarinet.test({
  name: 'hermetica-adapter: reads a fresh synced staking rate in non-mock mode',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const setup = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [hermeticaMainnet(), hermeticaMainnet()], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-mock-mode', [types.bool(true)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-cached-rate', [types.uint(77_000_000)], deployer.address),
      Tx.contractCall('mock-hermetica-staking', 'set-usdh-per-susdh', [types.uint(131_000_000)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'sync-hermetica-rate', [mock(deployer)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-mock-mode', [types.bool(false)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[1].result.expectOk().expectBool(true);
    setup.receipts[2].result.expectOk().expectBool(true);
    setup.receipts[3].result.expectOk().expectBool(true);
    setup.receipts[4].result.expectOk().expectUint(131_000_000);
    setup.receipts[5].result.expectOk().expectBool(true);

    const cachedRate = chain.callReadOnlyFn('hermetica-adapter', 'get-cached-rate', [], deployer.address);
    cachedRate.result.expectOk().expectUint(131_000_000);

    const liveRate = chain.callReadOnlyFn('hermetica-adapter', 'get-usdh-per-susdh-rate', [], deployer.address);
    liveRate.result.expectOk().expectUint(131_000_000);
  },
});

Clarinet.test({
  name: 'hermetica-adapter: rejects sync requests from an unconfigured staking principal in non-mock mode',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const setup = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [hermeticaMainnet(), hermeticaMainnet()], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-mock-mode', [types.bool(false)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'sync-hermetica-rate', [mock(deployer)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[1].result.expectOk().expectBool(true);
    setup.receipts[2].result.expectErr().expectUint(3710);
  },
});

Clarinet.test({
  name: 'hermetica-adapter: fails closed when the configured staking contract is not the live Hermetica principal',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const setup = chain.mineBlock([
      Tx.contractCall('hermetica-adapter', 'set-hermetica-config', [
        types.principal(`${deployer.address}.missing-hermetica-staking`),
        types.principal(`${deployer.address}.missing-hermetica-susdh`),
      ], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-mock-mode', [types.bool(false)], deployer.address),
      Tx.contractCall('hermetica-adapter', 'set-cached-rate', [types.uint(222_000_000)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[1].result.expectOk().expectBool(true);
    setup.receipts[2].result.expectOk().expectBool(true);

    const rate = chain.callReadOnlyFn('hermetica-adapter', 'get-usdh-per-susdh-rate', [], deployer.address);
    rate.result.expectErr().expectUint(3709);

    const balance = chain.callReadOnlyFn('hermetica-adapter', 'get-vault-usdh-balance', [types.uint(11)], deployer.address);
    balance.result.expectErr().expectUint(3709);
  },
});
