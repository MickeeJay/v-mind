import { StacksTestnet } from '@stacks/network';
import { uintCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

import { TestLogger } from '../../utils/test-logger';

import { TransactionBuilder } from './transaction-builder';
import { TransactionSigner } from './transaction-signer';

const senderKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('TransactionSigner', () => {
  it('signs unsigned transactions with nonce and estimated fee', async () => {
    const network = new StacksTestnet();
    const logger = new TestLogger();
    const builder = new TransactionBuilder(network, logger, senderKey);
    const signer = new TransactionSigner(network, logger, senderKey);

    const unsigned = await builder.buildUnsignedContractCall({
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      functionArgs: [uintCV(5n)],
    });

    const signed = await signer.sign({
      unsigned,
      feeMicroStx: 400n,
      nonce: 22n,
    });

    expect(signed.auth.spendingCondition.fee).toBe(400n);
    expect(signed.auth.spendingCondition.nonce).toBe(22n);
  });
});
