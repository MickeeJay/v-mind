// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'vault-receipt-token: implements required SIP-010 functions',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const recipient = accounts.get('wallet_3')!;
    const asset = accounts.get('wallet_1')!;
    const executor = accounts.get('wallet_2')!;

    const strategyVaultPrincipal = `${deployer.address}.strategy-vault`;

    const setup = chain.mineBlock([
      Tx.contractCall(
        'vault-receipt-token',
        'initialize-token',
        [
          types.principal(strategyVaultPrincipal),
          types.ascii('V-Mind Alpha Share'),
          types.ascii('vALPHA'),
          types.uint(6),
          types.some(types.utf8('https://v-mind.xyz/token/alpha')),
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
        [types.ascii('SIP010 Strategy'), types.uint(1), types.principal(asset.address), types.uint(1), types.principal(executor.address)],
        deployer.address,
      ),
      Tx.contractCall('strategy-vault', 'create-vault', [types.principal(asset.address), types.uint(2_000_000), types.uint(1)], deployer.address),
      Tx.contractCall(
        'vault-receipt-token',
        'transfer',
        [types.uint(500_000), types.principal(deployer.address), types.principal(recipient.address), types.none()],
        deployer.address,
      ),
    ]);

    setup.receipts[0].result.expectOk().expectBool(true);
    setup.receipts[3].result.expectOk().expectUint(1);
    setup.receipts[4].result.expectOk().expectBool(true);

    const name = chain.callReadOnlyFn('vault-receipt-token', 'get-name', [], deployer.address);
    name.result.expectOk().expectAscii('V-Mind Alpha Share');

    const symbol = chain.callReadOnlyFn('vault-receipt-token', 'get-symbol', [], deployer.address);
    symbol.result.expectOk().expectAscii('vALPHA');

    const decimals = chain.callReadOnlyFn('vault-receipt-token', 'get-decimals', [], deployer.address);
    decimals.result.expectOk().expectUint(6);

    const uri = chain.callReadOnlyFn('vault-receipt-token', 'get-token-uri', [], deployer.address);
    uri.result.expectOk().expectSome().expectUtf8('https://v-mind.xyz/token/alpha');

    const supply = chain.callReadOnlyFn('vault-receipt-token', 'get-total-supply', [], deployer.address);
    supply.result.expectOk().expectUint(2_000_000);

    const senderBalance = chain.callReadOnlyFn('vault-receipt-token', 'get-balance', [types.principal(deployer.address)], deployer.address);
    senderBalance.result.expectOk().expectUint(1_500_000);

    const recipientBalance = chain.callReadOnlyFn('vault-receipt-token', 'get-balance', [types.principal(recipient.address)], deployer.address);
    recipientBalance.result.expectOk().expectUint(500_000);
  },
});
