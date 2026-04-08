import { cleanEnv, str, port, url, num, bool } from 'envalid';

/**
 * Validates and provides typed environment variables for the agent service
 * Throws descriptive errors if required variables are missing or invalid
 */
export const env = cleanEnv(process.env, {
  // Application settings
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
    desc: 'Node environment',
  }),
  PORT: port({ default: 3001, desc: 'Application port' }),
  HOST: str({ default: 'localhost', desc: 'Application host' }),
  API_VERSION: str({ default: 'v1', desc: 'API version prefix' }),

  // Stacks blockchain configuration
  STACKS_NETWORK: str({
    choices: ['mainnet', 'testnet', 'devnet'],
    default: 'testnet',
    desc: 'Stacks network identifier',
  }),
  STACKS_NODE_URL: url({
    default: 'https://api.testnet.hiro.so',
    desc: 'Stacks node RPC URL',
  }),
  STACKS_DEPLOYER_ADDRESS: str({
    desc: 'Deployer Stacks address',
    example: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  }),
  STACKS_PRIVATE_KEY: str({
    desc: 'Stacks private key for signing transactions (SENSITIVE)',
  }),

  // External API configuration
  HIRO_API_BASE_URL: url({
    default: 'https://api.testnet.hiro.so',
    desc: 'Hiro API base URL',
  }),
  HIRO_API_KEY: str({
    default: '',
    desc: 'Hiro API key for higher rate limits (optional)',
  }),
  AI_INFERENCE_API_URL: url({
    desc: 'AI inference API endpoint',
    example: 'https://api.openai.com/v1',
  }),
  AI_INFERENCE_API_KEY: str({
    desc: 'AI inference API key (SENSITIVE)',
  }),

  // Database configuration
  DATABASE_URL: str({
    desc: 'PostgreSQL connection string (SENSITIVE)',
    example: 'postgresql://user:pass@localhost:5432/db',
  }),
  DATABASE_POOL_MIN: num({ default: 2, desc: 'Database pool minimum size' }),
  DATABASE_POOL_MAX: num({ default: 10, desc: 'Database pool maximum size' }),
  DATABASE_SSL_MODE: str({
    choices: ['disable', 'require', 'verify-ca', 'verify-full'],
    default: 'disable',
    desc: 'Database SSL mode',
  }),

  // Logging and monitoring
  LOG_LEVEL: str({
    choices: ['error', 'warn', 'info', 'debug', 'trace'],
    default: 'info',
    desc: 'Log level',
  }),
  LOG_FORMAT: str({
    choices: ['json', 'pretty'],
    default: 'json',
    desc: 'Log format',
  }),
  SENTRY_DSN: str({
    default: '',
    desc: 'Sentry DSN for error tracking (optional)',
  }),
  SENTRY_ENVIRONMENT: str({
    default: 'development',
    desc: 'Sentry environment tag',
  }),

  // Security and authentication
  JWT_SECRET: str({
    desc: 'JWT secret for API authentication (SENSITIVE)',
    minLength: 32,
  }),
  JWT_EXPIRES_IN: str({ default: '7d', desc: 'JWT token expiration time' }),
  RATE_LIMIT_RPM: num({ default: 100, desc: 'API rate limit per minute' }),
  CORS_ORIGINS: str({
    default: 'http://localhost:3000',
    desc: 'CORS allowed origins (comma-separated)',
  }),

  // Strategy execution configuration
  AUTO_EXECUTE_STRATEGIES: bool({
    default: false,
    desc: 'Enable automatic strategy execution',
  }),
  STRATEGY_EXECUTION_INTERVAL: num({
    default: 300,
    desc: 'Strategy execution interval in seconds',
  }),
  MAX_GAS_PRICE: num({
    default: 1000000,
    desc: 'Maximum gas price in microSTX',
  }),
  MIN_BALANCE_THRESHOLD: num({
    default: 1000000,
    desc: 'Minimum balance threshold in microSTX',
  }),
});

/**
 * Type-safe environment variables
 */
export type Env = typeof env;
