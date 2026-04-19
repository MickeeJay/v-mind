import { describe, expect, it } from 'vitest';

import { buildConfig } from './env';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  STACKS_NETWORK: 'testnet',
  STACKS_API_BASE_URL: 'https://api.testnet.hiro.so',
  STACKS_PRIVATE_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  API_HOST: '0.0.0.0',
  API_PORT: '3001',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  DATABASE_PATH: './data/vmind-agent.sqlite',
  AGENT_POLL_INTERVAL_MS: '5000',
  AGENT_LOG_EVERY_N_BLOCKS: '7',
  RPC_RETRY_ATTEMPTS: '4',
  RPC_RETRY_MIN_TIMEOUT_MS: '300',
  RPC_RETRY_MAX_TIMEOUT_MS: '6000',
  TX_FEE_MULTIPLIER: '1.5',
  TX_MIN_FEE_MICROSTX: '450',
  TX_CONFIRMATION_POLL_INTERVAL_MS: '4000',
  TX_REQUIRED_CONFIRMATIONS: '2',
  TX_MAX_CONFIRMATION_POLLS: '50',
  TX_MAX_RETRIES: '3',
  SHUTDOWN_TIMEOUT_MS: '10000',
};

describe('buildConfig', () => {
  it('builds a valid immutable config', () => {
    const config = buildConfig(baseEnv);

    expect(config.nodeEnv).toBe('test');
    expect(config.stacks.network).toBe('testnet');
    expect(config.stacks.nodeRpcUrl).toBe('https://api.testnet.hiro.so');
    expect(config.stacks.readOnlyCaller).toBe('ST000000000000000000002AMW42H');
    expect(config.api.host).toBe('0.0.0.0');
    expect(config.api.port).toBe(3001);
    expect(config.api.frontendOrigin).toBe('http://localhost:3000');
    expect(config.storage.databasePath).toBe('./data/vmind-agent.sqlite');
    expect(config.loop.pollIntervalMs).toBe(5000);
    expect(config.execution.feeMultiplier).toBe(1.5);
    expect(config.execution.minFeeMicroStx).toBe(450n);
    expect(config.execution.requiredConfirmations).toBe(2);
    expect(config.execution.contractPrincipal).toBe('ST000000000000000000002AMW42H.strategy-execution');
    expect(config.scheduling.maxExecutionsPerBlock).toBe(3);
    expect(config.monitoring.healthcheckPort).toBe(8080);
    expect(config.monitoring.metricsPort).toBe(9090);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.stacks)).toBe(true);
  });

  it('uses explicit node RPC and read-only caller when provided', () => {
    const config = buildConfig({
      ...baseEnv,
      STACKS_NODE_RPC_URL: 'https://stacks-node.example.com',
      STACKS_READONLY_CALLER: 'ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X',
    });

    expect(config.stacks.nodeRpcUrl).toBe('https://stacks-node.example.com');
    expect(config.stacks.readOnlyCaller).toBe('ST2J8EVYHP2NQX38NSYWW0YPPH2Q1D5NVTQJ9MS8X');
  });

  it('throws when required variables are missing', () => {
    const invalidEnv = { ...baseEnv };
    delete invalidEnv.STACKS_PRIVATE_KEY;

    expect(() => buildConfig(invalidEnv)).toThrow();
  });

  it('throws when variable types are invalid', () => {
    const invalidEnv = {
      ...baseEnv,
      AGENT_POLL_INTERVAL_MS: 'not-a-number',
    };

    expect(() => buildConfig(invalidEnv)).toThrow();
  });

  it('supports overriding scheduling and monitoring runtime values', () => {
    const config = buildConfig({
      ...baseEnv,
      API_HOST: '127.0.0.1',
      API_PORT: '4001',
      FRONTEND_ORIGIN: 'https://v-mind.app',
      DATABASE_PATH: 'C:/temp/vmind.sqlite',
      AGENT_MAX_EXECUTIONS_PER_BLOCK: '5',
      AGENT_MAX_CONCURRENT_EXECUTIONS: '4',
      ALERT_STALE_BLOCK_MS: '600000',
      ALERT_PENDING_TX_BLOCK_THRESHOLD: '25',
      ALERT_CONSECUTIVE_FAILURE_THRESHOLD: '4',
      HEALTHCHECK_PORT: '18080',
      METRICS_PORT: '19090',
      EXECUTION_FUNCTION_NAME: 'execute',
      EXECUTION_DEFAULT_PROTOCOL_ID: '2',
      EXECUTION_DEFAULT_ASSET_AMOUNT: '500',
    });

    expect(config.scheduling.maxExecutionsPerBlock).toBe(5);
    expect(config.scheduling.maxConcurrentExecutions).toBe(4);
    expect(config.monitoring.staleBlockThresholdMs).toBe(600000);
    expect(config.monitoring.pendingTxBlockThreshold).toBe(25);
    expect(config.monitoring.consecutiveFailureThreshold).toBe(4);
    expect(config.monitoring.healthcheckPort).toBe(18080);
    expect(config.monitoring.metricsPort).toBe(19090);
    expect(config.execution.functionName).toBe('execute');
    expect(config.execution.defaultProtocolId).toBe(2);
    expect(config.execution.defaultAssetAmount).toBe(500n);
    expect(config.api.host).toBe('127.0.0.1');
    expect(config.api.port).toBe(4001);
    expect(config.api.frontendOrigin).toBe('https://v-mind.app');
    expect(config.storage.databasePath).toBe('C:/temp/vmind.sqlite');
  });
});