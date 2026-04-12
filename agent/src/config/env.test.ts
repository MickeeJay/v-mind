import { describe, expect, it } from 'vitest';
import { buildConfig } from './env';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  STACKS_NETWORK: 'testnet',
  STACKS_API_BASE_URL: 'https://api.testnet.hiro.so',
  STACKS_PRIVATE_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
    expect(config.loop.pollIntervalMs).toBe(5000);
    expect(config.execution.feeMultiplier).toBe(1.5);
    expect(config.execution.minFeeMicroStx).toBe(450n);
    expect(config.execution.requiredConfirmations).toBe(2);
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
});