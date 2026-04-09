// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: withdrawal returns proportional assets for shares burned',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const asset = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [
          types.principal(strategyVaultPrincipal),
          types.ascii('V-Mind Vault Share'),
          types.ascii('vSHARE'),
          types.uint(6),
          types.some(types.utf8('https://v-mind.xyz/token/vshare')),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [types.principal(asset.address), types.ascii('STX'), types.uint(1_000_000), types.uint(30_000_000)],
        deployer.address,
      ),
      Tx.contractCall(
        'strategy-registry',
        'register-strategy',
        [types.ascii('Withdraw Strategy'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall('strategy-vault', 'accrue-yield', [types.uint(1), types.uint(1_000_000)], deployer.address),
      Tx.contractCall('strategy-vault', 'withdraw', [types.uint(1), types.uint(1_000_000)], deployer.address),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[3].result.expectOk().expectUint(1);
    setup.receipts[4].result.expectOk().expectUint(3_000_000);
    setup.receipts[5].result.expectOk().expectUint(1_500_000);

    const remainingAssets = chain.callReadOnlyFn('strategy-vault', 'get-vault-total-assets', [types.uint(1)], deployer.address);
    remainingAssets.result.expectOk().expectUint(1_500_000);

    const remainingShares = chain.callReadOnlyFn('strategy-vault', 'get-vault-share-balance', [types.uint(1), types.principal(deployer.address)], deployer.address);
    remainingShares.result.expectOk().expectUint(1_000_000);
  },
});
