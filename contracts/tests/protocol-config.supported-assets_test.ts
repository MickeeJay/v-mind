// @ts-nocheck
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';

Clarinet.test({
  name: 'protocol-config: owner can add and remove supported asset',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetContract = `${deployer.address}.mock-vault-token`;

    const addBlock = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [
          types.principal(assetContract),
          types.ascii('MOCK'),
          types.uint(1000),
          types.uint(500000),
        ],
        deployer.address,
      ),
    ]);

    addBlock.receipts[0].result.expectOk().expectPrincipal(assetContract);

    const readAfterAdd = chain.callReadOnlyFn(
      'protocol-config',
      'get-supported-asset',
      [types.principal(assetContract)],
      deployer.address,
    );
    readAfterAdd.result.expectSome();

    const removeBlock = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'remove-supported-asset',
        [types.principal(assetContract)],
        deployer.address,
      ),
    ]);

    removeBlock.receipts[0].result.expectOk().expectBool(true);

    const readAfterRemove = chain.callReadOnlyFn(
      'protocol-config',
      'get-supported-asset',
      [types.principal(assetContract)],
      deployer.address,
    );
    readAfterRemove.result.expectNone();
  },
});

Clarinet.test({
  name: 'protocol-config: rejects invalid supported asset limits',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetContract = `${deployer.address}.mock-protocol-adapter`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [
          types.principal(assetContract),
          types.ascii('BAD'),
          types.uint(10000),
          types.uint(9999),
        ],
        deployer.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2105);
  },
});

Clarinet.test({
  name: 'protocol-config: non-owner cannot add supported asset',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonOwner = accounts.get('wallet_1')!;
    const deployer = accounts.get('deployer')!;
    const assetContract = `${deployer.address}.mock-vault-token`;

    const block = chain.mineBlock([
      Tx.contractCall(
        'protocol-config',
        'add-supported-asset',
        [
          types.principal(assetContract),
          types.ascii('MOCK'),
          types.uint(1),
          types.uint(1000),
        ],
        nonOwner.address,
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(2100);
  },
});
