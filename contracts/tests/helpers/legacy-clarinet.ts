import { tx as sdkTx, type ParsedTransactionResult, type Simnet } from '@hirosystems/clarinet-sdk';
import { Cl, type ClarityValue } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import { c32address } from 'c32check';
import { ADDR, bootSimnet } from './simnet';

export interface Account {
  address: string;
}

type LegacySdkSimnet = Simnet & {
  mineBlock(txs: Array<ReturnType<typeof sdkTx.callPublicFn>>): unknown[];
  callReadOnlyFn(contract: string, method: string, args: ClarityValue[], sender: string): unknown;
  getAccounts?(): unknown;
};

type LegacyTransactionResult = Omit<ParsedTransactionResult, 'result'> & {
  result: LegacyValueAssertions;
};

type LegacyBlock = {
  receipts: LegacyTransactionResult[];
};

export type Chain = {
  mineBlock(txs: Array<ReturnType<typeof sdkTx.callPublicFn>>): LegacyBlock;
  callReadOnlyFn(contract: string, method: string, args: ClarityValue[], sender: string): LegacyTransactionResult;
};

export const Tx = {
  contractCall(contract: string, method: string, args: ClarityValue[], sender: string) {
    return sdkTx.callPublicFn(contract, method, args, sender);
  },
};

export const types = {
  principal(value: string) {
    if (value.includes('.')) {
      const [address, contractName] = value.split('.', 2);
      if (address && contractName) {
        return Cl.contractPrincipal(address, contractName);
      }
    }

    return Cl.standardPrincipal(value);
  },
  ascii(value: string) {
    return Cl.stringAscii(value);
  },
  utf8(value: string) {
    return Cl.stringUtf8(value);
  },
  uint(value: number | bigint) {
    return Cl.uint(value);
  },
  bool(value: boolean) {
    return Cl.bool(value);
  },
  some(value: ClarityValue) {
    return Cl.some(value);
  },
  none() {
    return Cl.none();
  },
  list(values: ClarityValue[]) {
    return Cl.list(values);
  },
  tuple(values: Record<string, ClarityValue>) {
    return Cl.tuple(values);
  },
};

type LegacyValueAssertion = {
  expectOk(): LegacyValueAssertions;
  expectErr(): LegacyValueAssertions;
  expectSome(): LegacyValueAssertions;
  expectNone(): LegacyValueAssertions;
  expectUint(expected?: number | bigint): LegacyValueAssertion;
  expectBool(expected?: boolean): LegacyValueAssertion;
  expectPrincipal(expected?: string): LegacyValueAssertion;
  expectAscii(expected?: string): LegacyValueAssertion;
  expectUtf8(expected?: string): LegacyValueAssertion;
  expectList(): LegacyListAssertions;
};

class LegacyValueAssertions implements LegacyValueAssertion {
  constructor(public readonly value: any) {}

  expectOk() {
    this.assertType('ok');
    return new LegacyValueAssertions((this.value as { value: ClarityValue }).value);
  }

  expectErr() {
    this.assertType('err');
    return new LegacyValueAssertions((this.value as { value: ClarityValue }).value);
  }

  expectSome() {
    this.assertType('some');
    return new LegacyValueAssertions((this.value as { value: ClarityValue }).value);
  }

  expectNone() {
    this.assertType('none');
    return this;
  }

  expectUint(expected?: number | bigint) {
    this.assertType('uint');

    if (expected !== undefined) {
      expect(BigInt((this.value as { value: bigint | number }).value)).toBe(BigInt(expected));
    }

    return this;
  }

  expectBool(expected?: boolean) {
    if (this.value.type !== 'true' && this.value.type !== 'false') {
      throw new Error(`Expected bool, got ${this.value.type}`);
    }

    if (expected !== undefined) {
      expect(this.value.type === 'true').toBe(expected);
    }

    return this;
  }

  expectPrincipal(expected?: string) {
    if (this.value.type !== 'address' && this.value.type !== 'contract') {
      throw new Error(`Expected principal, got ${this.value.type}`);
    }

    if (expected !== undefined) {
      expect(this.value.value).toBe(expected);
    }

    return this;
  }

  expectAscii(expected?: string) {
    this.assertType('ascii');

    if (expected !== undefined) {
      expect((this.value as { value: string }).value).toBe(expected);
    }

    return this;
  }

  expectUtf8(expected?: string) {
    this.assertType('utf8');

    if (expected !== undefined) {
      expect((this.value as { value: string }).value).toBe(expected);
    }

    return this;
  }

  expectList() {
    this.assertType('list');
    return new LegacyListAssertions((this.value as { value: ClarityValue[] }).value);
  }

  private assertType(expectedType: string) {
    expect(this.value.type).toBe(expectedType);
  }
}

class LegacyListAssertions {
  private index = 0;

  constructor(private readonly values: ClarityValue[]) {}

  private consume() {
    if (this.index >= this.values.length) {
      throw new Error('Expected more list items');
    }

    const value = this.values[this.index];
    if (value === undefined) {
      throw new Error('Expected more list items');
    }

    this.index += 1;
    return new LegacyValueAssertions(value);
  }

  expectUint(expected?: number | bigint) {
    this.consume().expectUint(expected);
    return this;
  }

  expectBool(expected?: boolean) {
    this.consume().expectBool(expected);
    return this;
  }

  expectPrincipal(expected?: string) {
    this.consume().expectPrincipal(expected);
    return this;
  }

  expectAscii(expected?: string) {
    this.consume().expectAscii(expected);
    return this;
  }

  expectUtf8(expected?: string) {
    this.consume().expectUtf8(expected);
    return this;
  }

  expectOk() {
    return this.consume().expectOk();
  }

  expectErr() {
    return this.consume().expectErr();
  }

  expectSome() {
    return this.consume().expectSome();
  }

  expectNone() {
    this.consume().expectNone();
    return this;
  }

  expectList() {
    return this.consume().expectList();
  }
}

function hasResultProperty(value: unknown): value is { result: ClarityValue } {
  return typeof value === 'object' && value !== null && 'result' in value;
}

function wrapLegacyTransactionResult(rawResult: unknown): LegacyTransactionResult {
  const payload = rawResult && typeof rawResult === 'object' ? { ...rawResult } : {};
  const resultValue = hasResultProperty(rawResult) ? rawResult.result : rawResult;

  return {
    ...payload,
    result: new LegacyValueAssertions(resultValue as ClarityValue),
  } as LegacyTransactionResult;
}

function normalizeAccountName(name: string) {
  const walletMatch = name.match(/^wallet[-_]?([0-9]+)$/);
  if (walletMatch) {
    return `wallet_${walletMatch[1]}`;
  }

  return name;
}

function extractAddress(candidate: unknown): string | undefined {
  if (typeof candidate === 'string') {
    return candidate;
  }

  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;

    if (typeof record.address === 'string') {
      return record.address;
    }

    if (typeof record.principal === 'string') {
      return record.principal;
    }

    if (typeof record.stxAddress === 'string') {
      return record.stxAddress;
    }
  }

  return undefined;
}

function fallbackWalletAddress(walletIndex: number) {
  return c32address(26, walletIndex.toString(16).padStart(40, '0'));
}

function createLegacyAccounts(simnet: LegacySdkSimnet): Map<string, Account> {
  const accounts = new Map<string, Account>();
  const rawAccounts = simnet.getAccounts?.();

  const registerAccount = (name: string, candidate: unknown) => {
    const address = extractAddress(candidate);
    if (address) {
      accounts.set(normalizeAccountName(name), { address });
    }
  };

  if (rawAccounts instanceof Map) {
    for (const [name, candidate] of rawAccounts.entries()) {
      registerAccount(name, candidate);
    }
  } else if (rawAccounts && typeof rawAccounts === 'object') {
    for (const [name, candidate] of Object.entries(rawAccounts as Record<string, unknown>)) {
      registerAccount(name, candidate);
    }
  }

  if (!accounts.has('deployer')) {
    accounts.set('deployer', { address: ADDR.deployer });
  }

  const fallbackWallets = [
    ADDR.wallet1,
    ADDR.wallet2,
    ADDR.wallet3,
    ADDR.wallet4,
    ADDR.wallet5,
    ...Array.from({ length: 27 }, (_, index) => fallbackWalletAddress(index + 6)),
  ];

  for (let index = 1; index <= 32; index += 1) {
    const accountName = `wallet_${index}`;
    if (!accounts.has(accountName)) {
      accounts.set(accountName, { address: fallbackWallets[index - 1] });
    }
  }

  return accounts;
}

function createLegacyChain(simnet: LegacySdkSimnet): Chain {
  return {
    mineBlock(txs) {
      return {
        receipts: simnet.mineBlock(txs).map((receipt) => wrapLegacyTransactionResult(receipt)),
      };
    },
    callReadOnlyFn(contract, method, args, sender) {
      return wrapLegacyTransactionResult(simnet.callReadOnlyFn(contract, method, args, sender));
    },
  };
}

type LegacyClarinetTestCase = {
  name: string;
  fn(chain: Chain, accounts: Map<string, Account>): Promise<void> | void;
};

export const Clarinet = {
  test(testCase: LegacyClarinetTestCase) {
    describe(testCase.name, () => {
      let chain: Chain;
      let accounts: Map<string, Account>;

      beforeEach(async () => {
        const simnet = (await bootSimnet()) as LegacySdkSimnet;
        chain = createLegacyChain(simnet);
        accounts = createLegacyAccounts(simnet);
      });

      it('runs the legacy test body', async () => {
        await testCase.fn(chain, accounts);
      });
    });
  },
};
