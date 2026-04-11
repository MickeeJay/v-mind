import {
  contractPrincipalCV,
  falseCV,
  responseOkCV,
  serializeCV,
  someCV,
  standardPrincipalCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentConfig } from '../config';
import { TestLogger } from '../utils/test-logger';
import { StacksClient } from './stacks-client';
import { VaultReader, VaultReaderError } from './vault-reader';

function encodeClarity(value: Parameters<typeof serializeCV>[0]): string {
  return `0x${Buffer.from(serializeCV(value)).toString('hex')}`;
}

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

const clientConfig: Pick<AgentConfig, 'stacks' | 'retry'> = {
  stacks: {
    network: 'testnet',
    apiBaseUrl: 'https://api.testnet.hiro.so',
    nodeRpcUrl: 'https://stacks-node.testnet.example',
    readOnlyCaller: 'ST000000000000000000002AMW42H',
    privateKey: '0'.repeat(64),
  },
  retry: {
    attempts: 1,
    minTimeoutMs: 1,
    maxTimeoutMs: 1,
  },
};

describe('VaultReader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses vault state from valid contract responses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          okay: true,
          result: encodeClarity(
            someCV(
              tupleCV({
                'vault-owner': standardPrincipalCV('ST000000000000000000002AMW42H'),
                'asset-contract': contractPrincipalCV(
                  'ST000000000000000000002AMW42H',
                  'token-stx'
                ),
                'total-assets': uintCV(2500000n),
                'strategy-id': uintCV(7n),
                'created-at-block': uintCV(100n),
                'last-execution-block': uintCV(120n),
                'vault-status': uintCV(1n),
                'cumulative-fees-paid': uintCV(123n),
                'execution-locked': falseCV(),
              })
            )
          ),
        })
      )
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(responseOkCV(uintCV(2500000n))) }))
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(responseOkCV(uintCV(7n))) }))
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(responseOkCV(uintCV(120n))) }))
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(responseOkCV(uintCV(1n))) }));

    const logger = new TestLogger();
    const client = new StacksClient(clientConfig, logger);
    const reader = new VaultReader(
      client,
      {
        contractAddress: 'ST000000000000000000002AMW42H',
        contractName: 'vault-core',
      },
      logger
    );

    const state = await reader.getVaultState(1n);

    expect(state.vaultId).toBe(1n);
    expect(state.currentBalance).toBe(2500000n);
    expect(state.assignedStrategy).toBe(7n);
    expect(state.lastExecutionBlock).toBe(120n);
    expect(state.status).toBe(1n);
    expect(state.metadata.owner).toBe('ST000000000000000000002AMW42H');
  });

  it('throws VaultReaderError on malformed vault tuple responses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        okay: true,
        result: encodeClarity(
          someCV(
            tupleCV({
              'vault-owner': standardPrincipalCV('ST000000000000000000002AMW42H'),
              'asset-contract': contractPrincipalCV(
                'ST000000000000000000002AMW42H',
                'token-stx'
              ),
              'total-assets': uintCV(2500000n),
              'created-at-block': uintCV(100n),
              'last-execution-block': uintCV(120n),
              'vault-status': uintCV(1n),
              'cumulative-fees-paid': uintCV(123n),
              'execution-locked': falseCV(),
            })
          )
        ),
      })
    );

    const logger = new TestLogger();
    const client = new StacksClient(clientConfig, logger);
    const reader = new VaultReader(
      client,
      {
        contractAddress: 'ST000000000000000000002AMW42H',
        contractName: 'vault-core',
      },
      logger
    );

    await expect(reader.getVaultState(1n)).rejects.toBeInstanceOf(VaultReaderError);
  });
});
