import { z } from 'zod';
import { DEFAULT_SHUTDOWN_TIMEOUT_MS, SERVICE_NAME } from './constants';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  STACKS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']),
  STACKS_API_BASE_URL: z.string().url(),
  STACKS_NODE_RPC_URL: z.string().url().optional(),
  STACKS_READONLY_CALLER: z.string().default('ST000000000000000000002AMW42H'),
  STACKS_PRIVATE_KEY: z.string().min(64),
  HIRO_API_KEY: z.string().optional(),
  AGENT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  AGENT_LOG_EVERY_N_BLOCKS: z.coerce.number().int().positive().default(5),
  RPC_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(4),
  RPC_RETRY_MIN_TIMEOUT_MS: z.coerce.number().int().positive().default(250),
  RPC_RETRY_MAX_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  TX_FEE_MULTIPLIER: z.coerce.number().positive().default(1.2),
  TX_MIN_FEE_MICROSTX: z.coerce.number().int().nonnegative().default(200),
  TX_CONFIRMATION_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  TX_REQUIRED_CONFIRMATIONS: z.coerce.number().int().positive().default(1),
  TX_MAX_CONFIRMATION_POLLS: z.coerce.number().int().positive().default(60),
  TX_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  EXECUTION_SENDER_ADDRESS: z.string().min(1).default('ST000000000000000000002AMW42H'),
  EXECUTION_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.strategy-execution'),
  EXECUTION_FUNCTION_NAME: z.string().min(1).default('execute-strategy'),
  EXECUTION_DEFAULT_PROTOCOL_ID: z.coerce.number().int().positive().default(1),
  EXECUTION_DEFAULT_ASSET_AMOUNT: z.coerce.number().int().positive().default(1),
  VAULT_CORE_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.vault-core'),
  STRATEGY_REGISTRY_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.strategy-registry'),
  TRAIT_ZEST_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.zest-protocol-adapter'),
  TRAIT_ALEX_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.alex-liquidity-adapter'),
  TRAIT_STACKINGDAO_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.stackingdao-adapter'),
  TRAIT_HERMETICA_CONTRACT_PRINCIPAL: z.string().min(3).default('ST000000000000000000002AMW42H.hermetica-adapter'),
  AGENT_MAX_EXECUTIONS_PER_BLOCK: z.coerce.number().int().positive().default(3),
  AGENT_MAX_CONCURRENT_EXECUTIONS: z.coerce.number().int().positive().default(2),
  ALERT_STALE_BLOCK_MS: z.coerce.number().int().positive().default(300000),
  ALERT_PENDING_TX_BLOCK_THRESHOLD: z.coerce.number().int().positive().default(20),
  ALERT_CONSECUTIVE_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3),
  HEALTHCHECK_HOST: z.string().min(1).default('0.0.0.0'),
  HEALTHCHECK_PORT: z.coerce.number().int().positive().default(8080),
  METRICS_HOST: z.string().min(1).default('0.0.0.0'),
  METRICS_PORT: z.coerce.number().int().positive().default(9090),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_SHUTDOWN_TIMEOUT_MS),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AgentConfig {
  readonly serviceName: string;
  readonly nodeEnv: RawEnv['NODE_ENV'];
  readonly logLevel: RawEnv['LOG_LEVEL'];
  readonly stacks: Readonly<{
    network: RawEnv['STACKS_NETWORK'];
    apiBaseUrl: string;
    nodeRpcUrl: string;
    readOnlyCaller: string;
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
  readonly execution: Readonly<{
    feeMultiplier: number;
    minFeeMicroStx: bigint;
    confirmationPollIntervalMs: number;
    requiredConfirmations: number;
    maxConfirmationPolls: number;
    maxRetries: number;
    senderAddress: string;
    contractPrincipal: string;
    functionName: string;
    defaultProtocolId: number;
    defaultAssetAmount: bigint;
  }>;
  readonly contracts: Readonly<{
    vaultCoreContractPrincipal: string;
    strategyRegistryContractPrincipal: string;
    traitZestContractPrincipal: string;
    traitAlexContractPrincipal: string;
    traitStackingDaoContractPrincipal: string;
    traitHermeticaContractPrincipal: string;
  }>;
  readonly scheduling: Readonly<{
    maxExecutionsPerBlock: number;
    maxConcurrentExecutions: number;
  }>;
  readonly shutdown: Readonly<{
    timeoutMs: number;
  }>;
  readonly monitoring: Readonly<{
    healthcheckHost: string;
    healthcheckPort: number;
    metricsHost: string;
    metricsPort: number;
    staleBlockThresholdMs: number;
    pendingTxBlockThreshold: number;
    consecutiveFailureThreshold: number;
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
      nodeRpcUrl: parsed.STACKS_NODE_RPC_URL ?? parsed.STACKS_API_BASE_URL,
      readOnlyCaller: parsed.STACKS_READONLY_CALLER,
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
    execution: Object.freeze({
      feeMultiplier: parsed.TX_FEE_MULTIPLIER,
      minFeeMicroStx: BigInt(parsed.TX_MIN_FEE_MICROSTX),
      confirmationPollIntervalMs: parsed.TX_CONFIRMATION_POLL_INTERVAL_MS,
      requiredConfirmations: parsed.TX_REQUIRED_CONFIRMATIONS,
      maxConfirmationPolls: parsed.TX_MAX_CONFIRMATION_POLLS,
      maxRetries: parsed.TX_MAX_RETRIES,
      senderAddress: parsed.EXECUTION_SENDER_ADDRESS,
      contractPrincipal: parsed.EXECUTION_CONTRACT_PRINCIPAL,
      functionName: parsed.EXECUTION_FUNCTION_NAME,
      defaultProtocolId: parsed.EXECUTION_DEFAULT_PROTOCOL_ID,
      defaultAssetAmount: BigInt(parsed.EXECUTION_DEFAULT_ASSET_AMOUNT),
    }),
    contracts: Object.freeze({
      vaultCoreContractPrincipal: parsed.VAULT_CORE_CONTRACT_PRINCIPAL,
      strategyRegistryContractPrincipal: parsed.STRATEGY_REGISTRY_CONTRACT_PRINCIPAL,
      traitZestContractPrincipal: parsed.TRAIT_ZEST_CONTRACT_PRINCIPAL,
      traitAlexContractPrincipal: parsed.TRAIT_ALEX_CONTRACT_PRINCIPAL,
      traitStackingDaoContractPrincipal: parsed.TRAIT_STACKINGDAO_CONTRACT_PRINCIPAL,
      traitHermeticaContractPrincipal: parsed.TRAIT_HERMETICA_CONTRACT_PRINCIPAL,
    }),
    scheduling: Object.freeze({
      maxExecutionsPerBlock: parsed.AGENT_MAX_EXECUTIONS_PER_BLOCK,
      maxConcurrentExecutions: parsed.AGENT_MAX_CONCURRENT_EXECUTIONS,
    }),
    shutdown: Object.freeze({
      timeoutMs: parsed.SHUTDOWN_TIMEOUT_MS,
    }),
    monitoring: Object.freeze({
      healthcheckHost: parsed.HEALTHCHECK_HOST,
      healthcheckPort: parsed.HEALTHCHECK_PORT,
      metricsHost: parsed.METRICS_HOST,
      metricsPort: parsed.METRICS_PORT,
      staleBlockThresholdMs: parsed.ALERT_STALE_BLOCK_MS,
      pendingTxBlockThreshold: parsed.ALERT_PENDING_TX_BLOCK_THRESHOLD,
      consecutiveFailureThreshold: parsed.ALERT_CONSECUTIVE_FAILURE_THRESHOLD,
    }),
  });
}

