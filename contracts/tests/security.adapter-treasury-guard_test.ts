import { Clarinet, Tx, Chain, Account, types } from './helpers/legacy-clarinet';

Clarinet.test({
  name: 'security: adapter fee collection rejects non-protocol treasury destination',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const attackerTreasury = accounts.get('wallet_8')!;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'zest-protocol-adapter',
        'set-zest-config',
        [
          types.principal(`${deployer.address}.mock-zest-protocol`),
          types.principal(`${deployer.address}.mock-zest-protocol`),
          types.principal(`${deployer.address}.mock-zest-protocol`),
          types.principal(`${deployer.address}.mock-zest-protocol`),
          types.principal(`${deployer.address}.mock-zest-protocol`),
        ],
        deployer.address,
      ),
    ]);

    const zestFee = chain.callReadOnlyFn(
      'zest-protocol-adapter',
      'collect-zest-fee',
      [types.uint(10_000), types.principal(attackerTreasury.address)],
      deployer.address,
    );
    const alexFee = chain.callReadOnlyFn(
      'alex-liquidity-adapter',
      'collect-alex-fee',
      [types.uint(10_000), types.principal(attackerTreasury.address)],
      deployer.address,
    );
    const stackingdaoFee = chain.callReadOnlyFn(
      'stackingdao-adapter',
      'collect-stackingdao-fee',
      [types.uint(10_000), types.principal(attackerTreasury.address)],
      deployer.address,
    );
    const hermeticaFee = chain.callReadOnlyFn(
      'hermetica-adapter',
      'collect-hermetica-fee',
      [types.uint(10_000), types.principal(attackerTreasury.address)],
      deployer.address,
    );

    setup.receipts[0].result.expectOk().expectBool(true);
    zestFee.result.expectErr().expectUint(3405);
    alexFee.result.expectErr().expectUint(3505);
    stackingdaoFee.result.expectErr().expectUint(3605);
    hermeticaFee.result.expectErr().expectUint(3705);
  },
});
