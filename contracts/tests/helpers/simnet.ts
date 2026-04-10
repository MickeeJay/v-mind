import { initSimnet, tx, type ParsedTransactionResult, type Simnet } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

export const ADDR = {
  deployer: 'ST33898GA3Q16CGXTNXACHEBF7TP5ABREYTTFC138',
  wallet1: 'ST15022M49CD9GZM1DYX6YTQA726DN9FC8BGTZTES',
  wallet2: 'ST1E8QVGYNNSMJ7HEJ8CB1RM1WW2916QYMXXTR0PW',
  wallet3: 'ST2TBSRAHAEBSJE2TGGXAPJTCVFQ8QET782A549PY',
  wallet4: 'ST3QRAZ5ND6JC0MPKEEDEBJJN8HGZX311G8C57GE7',
  wallet5: 'ST2ZHF1FERSTYR8N7VQMW3J7N43SHW26JQYBPJ2CW',
} as const;

function ensureSdkCompatibleSimnetPlan() {
  const planPath = path.resolve(process.cwd(), 'deployments', 'default.simnet-plan.yaml');

  if (!fs.existsSync(planPath)) {
    return;
  }

  const source = fs.readFileSync(planPath, 'utf8');
  if (!source.includes('transaction-type:')) {
    return;
  }

  const lines = source.split(/\r?\n/);
  const output: string[] = [];
  let inTransaction = false;
  let transactionIndent = 0;

  for (const line of lines) {
    const txMatch = line.match(/^(\s*)-\s*transaction-type:\s*([^\s]+)\s*$/);
    if (txMatch) {
      const indent = txMatch[1];
      const txType = txMatch[2];
      output.push(`${indent}- ${txType}:`);
      inTransaction = true;
      transactionIndent = indent.length;
      continue;
    }

    if (inTransaction) {
      const lineIndent = (line.match(/^\s*/) ?? [''])[0].length;
      if (line.trim() === '') {
        output.push(line);
        continue;
      }

      if (lineIndent > transactionIndent) {
        output.push(`  ${line}`);
        continue;
      }

      inTransaction = false;
    }

    output.push(line);
  }

  fs.writeFileSync(planPath, output.join('\n'));
}

export async function bootSimnet(): Promise<Simnet> {
  ensureSdkCompatibleSimnetPlan();
  return initSimnet('./Clarinet.toml');
}

export function p(address: string) {
  return Cl.standardPrincipal(address);
}

export function u(value: number | bigint) {
  return Cl.uint(value);
}

export function ascii(value: string) {
  return Cl.stringAscii(value);
}

export function utf8(value: string) {
  return Cl.stringUtf8(value);
}

export function b(value: boolean) {
  return Cl.bool(value);
}

export function expectOk(result: any) {
  expect(result.type).toBe('ok');
}

export function expectErr(result: any, code: number) {
  expect(result.type).toBe('err');
  expect(result.value.type).toBe('uint');
  expect(Number(result.value.value)).toBe(code);
}

export function expectOkBool(result: any, value: boolean) {
  expectOk(result);
  expect(result.value.type).toBe(value ? 'true' : 'false');
}

export function expectOkUint(result: any, value: number) {
  expectOk(result);
  expect(result.value.type).toBe('uint');
  expect(Number(result.value.value)).toBe(value);
}

export function mine(simnet: Simnet, calls: Array<ReturnType<typeof tx.callPublicFn>>): ParsedTransactionResult[] {
  return simnet.mineBlock(calls);
}

export function adapterTraits() {
  return [
    Cl.contractPrincipal(ADDR.deployer, 'mock-defi-integrations'),
    Cl.contractPrincipal(ADDR.deployer, 'mock-defi-integrations'),
    Cl.contractPrincipal(ADDR.deployer, 'mock-defi-integrations'),
    Cl.contractPrincipal(ADDR.deployer, 'mock-defi-integrations'),
  ];
}

export function initializeVaultToken(simnet: Simnet) {
  return mine(simnet, [
    tx.callPublicFn(
      'vault-receipt-token',
      'initialize-token',
      [
        Cl.contractPrincipal(ADDR.deployer, 'vault-core'),
        ascii('V-Mind Vault Share'),
        ascii('vMIND'),
        u(6),
        Cl.none(),
      ],
      ADDR.deployer,
    ),
  ]);
}

export function registerDefaultAssetAndStrategy(simnet: Simnet) {
  return mine(simnet, [
    tx.callPublicFn(
      'protocol-config',
      'add-supported-asset',
      [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(20_000_000)],
      ADDR.deployer,
    ),
    tx.callPublicFn(
      'strategy-registry',
      'register-strategy',
      [ascii('Default Strategy'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
      ADDR.deployer,
    ),
  ]);
}
