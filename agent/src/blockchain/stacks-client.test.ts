import { responseOkCV, serializeCV, uintCV } from '@stacks/transactions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AgentConfig } from '../config';
import { TestLogger } from '../utils/test-logger';
import { StacksClient } from './stacks-client';

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
    attempts: 5,
    minTimeoutMs: 1,
    maxTimeoutMs: 1,
  },
};

describe('StacksClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries block height calls on 5xx and returns parsed height', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ error: 'upstream unavailable' }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: 'still warming up' }, 502))
      .mockResolvedValueOnce(
        jsonResponse({
          stacks_tip_height: 9012,
          stacks_tip: '0xabc123',
          burn_block_height: 1000,
        })
      );

    const client = new StacksClient(clientConfig, new TestLogger());
    const height = await client.getCurrentBlockHeight();

    expect(height).toBe(9012);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('decodes and validates read-only function responses with zod schemas', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        okay: true,
        result: encodeClarity(responseOkCV(uintCV(42n))),
      })
    );

    const client = new StacksClient(clientConfig, new TestLogger());
    const result = await client.callReadOnlyFunction({
      contractAddress: 'ST000000000000000000002AMW42H',
      contractName: 'vault-core',
      functionName: 'get-vault-total-assets',
      functionArgs: [uintCV(1n)],
      responseSchema: z.object({
        type: z.literal('ok'),
        value: z.bigint(),
      }),
    });

    expect(result.type).toBe('ok');
    expect(result.value).toBe(42n);
  });
});
