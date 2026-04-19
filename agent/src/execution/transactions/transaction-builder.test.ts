import { StacksTestnet } from '@stacks/network';
import { PayloadType, uintCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

import { TestLogger } from '../../utils/test-logger';

import { TransactionBuilder } from './transaction-builder';

const testSenderKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('TransactionBuilder', () => {
  it('builds an unsigned contract call transaction from a contract principal', async () => {
    const builder = new TransactionBuilder(new StacksTestnet(), new TestLogger(), testSenderKey);

    const unsigned = await builder.buildUnsignedContractCall({
      contractPrincipal: 'ST000000000000000000002AMW42H.vault-core',
      functionName: 'execute-strategy',
      functionArgs: [uintCV(9n)],
    });

    expect(unsigned.contractAddress).toBe('ST000000000000000000002AMW42H');
    expect(unsigned.contractName).toBe('vault-core');
    expect(unsigned.transaction.payload.payloadType).toBe(PayloadType.ContractCall);
    expect(unsigned.senderKey).toBe(testSenderKey);
  });

  it('throws when contract principal is malformed', async () => {
    const builder = new TransactionBuilder(new StacksTestnet(), new TestLogger(), testSenderKey);

    await expect(
      builder.buildUnsignedContractCall({
        contractPrincipal: 'ST000000000000000000002AMW42H',
        functionName: 'execute-strategy',
        functionArgs: [uintCV(1n)],
      })
    ).rejects.toThrow('Contract principal must be in <address>.<contract-name> format');
  });
});
