import {
  Configuration,
  InfoApi,
  type ConfigurationParameters,
} from '@stacks/blockchain-api-client';
import {
  StacksMainnet,
  StacksMocknet,
  StacksNetwork,
  StacksTestnet,
} from '@stacks/network';
import { cvToValue, deserializeCV, serializeCV, type ClarityValue } from '@stacks/transactions';
import { z } from 'zod';
import type { AgentConfig } from '../config';
import type { AppLogger } from '../utils/logger';
import { coreNodeInfoSchema, readOnlyCallResponseSchema } from './schemas';
import { HttpRequestError, withRetry } from './retry';

export interface ChainTip {
  blockHeight: number;
  blockHash?: string;
  burnBlockHeight?: number;
}

export interface BlockchainClient {
  getChainTip(): Promise<ChainTip>;
  getCurrentBlockHeight(): Promise<number>;
  callReadOnlyFunction<T>(request: ReadOnlyFunctionRequest<T>): Promise<T>;
}

export interface ReadOnlyFunctionRequest<T> {
  contractAddress: string;
  contractName?: string;
  functionName: string;
  functionArgs: ClarityValue[];
  responseSchema: z.ZodType<T>;
  sender?: string;
}

export class StacksClient implements BlockchainClient {
  private readonly infoApi: InfoApi;

  constructor(
    private readonly config: Pick<AgentConfig, 'stacks' | 'retry'>,
    private readonly logger: AppLogger
  ) {
    const configurationOptions: ConfigurationParameters = {
      basePath: this.config.stacks.apiBaseUrl,
    };

    if (this.config.stacks.hiroApiKey) {
      configurationOptions.headers = {
        'x-api-key': this.config.stacks.hiroApiKey,
      };
    }

    this.infoApi = new InfoApi(new Configuration(configurationOptions));
  }

  async getChainTip(): Promise<ChainTip> {
    return withRetry(
      async (): Promise<ChainTip> => {
        this.logger.debug({ target: 'hiro-api', method: 'getCoreApiInfo' }, 'Outbound blockchain request');

        try {
          const response = await this.infoApi.getCoreApiInfo();
          const parsed = coreNodeInfoSchema.parse(response);

          return {
            blockHeight: parsed.stacks_tip_height,
            blockHash: parsed.stacks_tip,
            burnBlockHeight: parsed.burn_block_height,
          };
        } catch (error) {
          const status = getErrorStatusCode(error);
          if (typeof status === 'number' && status >= 500) {
            throw new HttpRequestError('Failed to fetch chain tip from Hiro API', status);
          }

          throw error;
        }
      },
      this.config.retry,
      this.logger,
      'hiro.getCoreApiInfo'
    );
  }

  async getCurrentBlockHeight(): Promise<number> {
    const info = await withRetry(
      () =>
        this.fetchJson(
          this.joinUrl(this.config.stacks.nodeRpcUrl, '/v2/info'),
          {
            method: 'GET',
            headers: this.getRequestHeaders(),
          },
          coreNodeInfoSchema
        ),
      this.config.retry,
      this.logger,
      'node.getCurrentBlockHeight'
    );

    return info.stacks_tip_height;
  }

  async callReadOnlyFunction<T>(request: ReadOnlyFunctionRequest<T>): Promise<T> {
    const contractRef = normalizeContractRef(request.contractAddress, request.contractName);
    const body = {
      sender: request.sender ?? this.config.stacks.readOnlyCaller,
      arguments: request.functionArgs.map((argument) => `0x${Buffer.from(serializeCV(argument)).toString('hex')}`),
    };

    const response = await withRetry(
      () =>
        this.fetchJson(
          this.joinUrl(
            this.config.stacks.nodeRpcUrl,
            `/v2/contracts/call-read/${contractRef.address}/${contractRef.name}/${request.functionName}`
          ),
          {
            method: 'POST',
            headers: this.getRequestHeaders({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(body),
          },
          readOnlyCallResponseSchema
        ),
      this.config.retry,
      this.logger,
      `node.callReadOnlyFunction.${request.functionName}`
    );

    if (!response.okay) {
      throw new Error(response.cause ?? `Read-only call ${request.functionName} failed`);
    }

    const clarityValue = deserializeCV(response.result);
    const decoded = cvToValue(clarityValue) as unknown;
    return request.responseSchema.parse(decoded);
  }

  private async fetchJson<T>(
    url: string,
    init: RequestInit,
    schema: z.ZodType<T>
  ): Promise<T> {
    this.logger.debug(
      {
        target: 'stacks-node',
        method: init.method ?? 'GET',
        url,
      },
      'Outbound blockchain request'
    );

    const response = await fetch(url, init);

    if (!response.ok) {
      const errorBody = await safeJson(response);
      if (response.status >= 500) {
        throw new HttpRequestError(`Request to ${url} failed with ${response.status}`, response.status, errorBody);
      }

      throw new Error(`Request to ${url} failed with ${response.status}`);
    }

    const parsed = await safeJson(response);
    return schema.parse(parsed);
  }

  private getRequestHeaders(overrides: Record<string, string> = {}): Record<string, string> {
    return {
      ...(this.config.stacks.hiroApiKey ? { 'x-api-key': this.config.stacks.hiroApiKey } : {}),
      ...overrides,
    };
  }

  private joinUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }
}

export class StacksApiBlockchainClient extends StacksClient {}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  return JSON.parse(text) as unknown;
}

function normalizeContractRef(contractAddress: string, contractName?: string): { address: string; name: string } {
  if (contractName) {
    return {
      address: contractAddress,
      name: contractName,
    };
  }

  const [address, name] = contractAddress.split('.');
  if (!address || !name) {
    throw new Error('contractAddress must be either <address> with contractName set or <address>.<contract-name>');
  }

  return { address, name };
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') {
    return candidate.status;
  }

  if (typeof candidate.response?.status === 'number') {
    return candidate.response.status;
  }

  return undefined;
}

export function createStacksNetwork(network: AgentConfig['stacks']['network'], apiBaseUrl: string): StacksNetwork {
  switch (network) {
    case 'mainnet':
      return new StacksMainnet({ url: apiBaseUrl });
    case 'devnet':
      return new StacksMocknet({ url: apiBaseUrl });
    default:
      return new StacksTestnet({ url: apiBaseUrl });
  }
}