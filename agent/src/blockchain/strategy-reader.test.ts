import {
  contractPrincipalCV,
  falseCV,
  serializeCV,
  someCV,
  stringAsciiCV,
  standardPrincipalCV,
  trueCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentConfig } from '../config';
import { TestLogger } from '../utils/test-logger';
import { StacksClient } from './stacks-client';
import { StrategyReader, StrategyReaderError } from './strategy-reader';

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

function strategyTuple(active: boolean) {
  return someCV(
    tupleCV({
      'strategy-name': stringAsciiCV('Yield Strategy A'),
      'strategy-type': uintCV(1n),
      'target-protocol': contractPrincipalCV('ST000000000000000000002AMW42H', 'zest-adapter'),
      'risk-tier': uintCV(2n),
      'authorized-executor': standardPrincipalCV('ST000000000000000000002AMW42H'),
      active: active ? trueCV() : falseCV(),
      'created-at-block': uintCV(50n),
      'last-updated-block': uintCV(95n),
    })
  );
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

describe('StrategyReader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only active strategies with typed parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(uintCV(2n)) }))
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(strategyTuple(true)) }))
      .mockResolvedValueOnce(jsonResponse({ okay: true, result: encodeClarity(strategyTuple(false)) }));

    const logger = new TestLogger();
    const client = new StacksClient(clientConfig, logger);
    const reader = new StrategyReader(
      client,
      {
        contractAddress: 'ST000000000000000000002AMW42H',
        contractName: 'strategy-registry',
      },
      logger
    );

    const active = await reader.listActiveStrategies();

    expect(active).toHaveLength(1);
    expect(active[0].strategyId).toBe(1n);
    expect(active[0].active).toBe(true);
    expect(active[0].parameters.name).toBe('Yield Strategy A');
    expect(active[0].parameters.riskTier).toBe(2n);
  });

  it('throws StrategyReaderError for malformed strategy entries', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        okay: true,
        result: encodeClarity(
          someCV(
            tupleCV({
              'strategy-name': stringAsciiCV('Broken Strategy'),
              'strategy-type': uintCV(1n),
              'target-protocol': contractPrincipalCV(
                'ST000000000000000000002AMW42H',
                'zest-adapter'
              ),
              'authorized-executor': standardPrincipalCV('ST000000000000000000002AMW42H'),
              active: trueCV(),
              'created-at-block': uintCV(50n),
              'last-updated-block': uintCV(95n),
            })
          )
        ),
      })
    );

    const logger = new TestLogger();
    const client = new StacksClient(clientConfig, logger);
    const reader = new StrategyReader(
      client,
      {
        contractAddress: 'ST000000000000000000002AMW42H',
        contractName: 'strategy-registry',
      },
      logger
    );

    await expect(reader.getStrategyConfiguration(1n)).rejects.toBeInstanceOf(StrategyReaderError);
  });
});
