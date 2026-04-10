import { z } from 'zod';
import { DEFAULT_SHUTDOWN_TIMEOUT_MS, SERVICE_NAME } from './constants';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  STACKS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']),
  STACKS_API_BASE_URL: z.string().url(),
  STACKS_PRIVATE_KEY: z.string().min(64),
  HIRO_API_KEY: z.string().optional(),
  AGENT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  AGENT_LOG_EVERY_N_BLOCKS: z.coerce.number().int().positive().default(5),
  RPC_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(4),
  RPC_RETRY_MIN_TIMEOUT_MS: z.coerce.number().int().positive().default(250),
  RPC_RETRY_MAX_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_SHUTDOWN_TIMEOUT_MS),
  HEALTHCHECK_PORT: z.coerce.number().int().positive().optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AgentConfig {
  readonly serviceName: string;
  readonly nodeEnv: RawEnv['NODE_ENV'];
  readonly logLevel: RawEnv['LOG_LEVEL'];
  readonly stacks: Readonly<{
    network: RawEnv['STACKS_NETWORK'];
    apiBaseUrl: string;
    privateKey: string;
    hiroApiKey?: string;
  }>;
  readonly loop: Readonly<{
    pollIntervalMs: number;
    logEveryNBlocks: number;
  }>;
  readonly retry: Readonly<{
    attempts: number;
    minTimeoutMs: number;
    maxTimeoutMs: number;
  }>;
  readonly shutdown: Readonly<{
    timeoutMs: number;
  }>;
  readonly monitoring: Readonly<{
    healthcheckPort?: number;
  }>;
}

export function buildConfig(source: NodeJS.ProcessEnv): AgentConfig {
  const parsed = envSchema.parse(source);

  return Object.freeze({
    serviceName: SERVICE_NAME,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    stacks: Object.freeze({
      network: parsed.STACKS_NETWORK,
      apiBaseUrl: parsed.STACKS_API_BASE_URL,
      privateKey: parsed.STACKS_PRIVATE_KEY,
      hiroApiKey: parsed.HIRO_API_KEY,
    }),
    loop: Object.freeze({
      pollIntervalMs: parsed.AGENT_POLL_INTERVAL_MS,
      logEveryNBlocks: parsed.AGENT_LOG_EVERY_N_BLOCKS,
    }),
    retry: Object.freeze({
      attempts: parsed.RPC_RETRY_ATTEMPTS,
      minTimeoutMs: parsed.RPC_RETRY_MIN_TIMEOUT_MS,
      maxTimeoutMs: parsed.RPC_RETRY_MAX_TIMEOUT_MS,
    }),
    shutdown: Object.freeze({
      timeoutMs: parsed.SHUTDOWN_TIMEOUT_MS,
    }),
    monitoring: Object.freeze({
      healthcheckPort: parsed.HEALTHCHECK_PORT,
    }),
  });
}

export const config = buildConfig(process.env);
