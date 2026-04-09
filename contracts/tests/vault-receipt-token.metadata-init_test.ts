// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: metadata is configurable once via initializer',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [
          types.principal(strategyVaultPrincipal),
          types.ascii('V-Mind Meta Share'),
          types.ascii('vMETA'),
          types.uint(8),
          types.some(types.utf8('https://v-mind.xyz/token/meta')),
        ],
        deployer.address,
      ),
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [
          types.principal(strategyVaultPrincipal),
          types.ascii('Another Name'),
          types.ascii('OTHER'),
          types.uint(6),
          types.none(),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(2802);

    chain.callReadOnlyFn('vault-receipt-token', 'get-name', [], deployer.address).result.expectOk().expectAscii('V-Mind Meta Share');
    chain.callReadOnlyFn('vault-receipt-token', 'get-symbol', [], deployer.address).result.expectOk().expectAscii('vMETA');
    chain.callReadOnlyFn('vault-receipt-token', 'get-decimals', [], deployer.address).result.expectOk().expectUint(8);
    chain.callReadOnlyFn('vault-receipt-token', 'get-token-uri', [], deployer.address).result.expectOk().expectSome().expectUtf8('https://v-mind.xyz/token/meta');
  },
});
