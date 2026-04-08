import { cleanEnv, str, url, bool } from 'envalid';

/**
 * Validates and provides typed public environment variables for Next.js
 * All variables here must be prefixed with NEXT_PUBLIC_ to be exposed to the browser
 * Throws descriptive errors if required variables are missing or invalid
 */
export const env = cleanEnv(process.env, {
  // Next.js configuration
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),

  // Stacks blockchain configuration (public)
  NEXT_PUBLIC_STACKS_NETWORK: str({
    choices: ['mainnet', 'testnet', 'devnet'],
    default: 'testnet',
    desc: 'Stacks network identifier (exposed to browser)',
  }),
  NEXT_PUBLIC_STACKS_API_URL: url({
    default: 'https://api.testnet.hiro.so',
    desc: 'Stacks API URL for wallet connections (exposed to browser)',
  }),
  NEXT_PUBLIC_DEPLOYER_ADDRESS: str({
    desc: 'Contract deployer address (exposed to browser)',
    example: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  }),
  NEXT_PUBLIC_CONTRACT_NAME: str({
    default: 'v-mind-core',
    desc: 'Main contract name (exposed to browser)',
  }),

  // API configuration (public)
  NEXT_PUBLIC_API_BASE_URL: url({
    default: 'http://localhost:3001',
    desc: 'Agent service API base URL (exposed to browser)',
  }),
  NEXT_PUBLIC_API_VERSION: str({
    default: 'v1',
    desc: 'API version (exposed to browser)',
  }),
  NEXT_PUBLIC_API_TIMEOUT: str({
    default: '30000',
    desc: 'API timeout in milliseconds (exposed to browser)',
  }),

  // Feature flags (public)
  NEXT_PUBLIC_ENABLE_BETA_FEATURES: bool({
    default: false,
    desc: 'Enable beta features (exposed to browser)',
  }),
  NEXT_PUBLIC_ENABLE_ADVANCED_STRATEGIES: bool({
    default: false,
    desc: 'Enable advanced strategy builder (exposed to browser)',
  }),
  NEXT_PUBLIC_ENABLE_ANALYTICS: bool({
    default: false,
    desc: 'Enable analytics tracking (exposed to browser)',
  }),
  NEXT_PUBLIC_ENABLE_MAINNET: bool({
    default: false,
    desc: 'Enable mainnet mode (exposed to browser)',
  }),

  // Analytics and monitoring (public)
  NEXT_PUBLIC_GA_ID: str({
    default: '',
    desc: 'Google Analytics ID (optional, exposed to browser)',
  }),
  NEXT_PUBLIC_POSTHOG_KEY: str({
    default: '',
    desc: 'PostHog API key (optional, exposed to browser)',
  }),
  NEXT_PUBLIC_POSTHOG_HOST: url({
    default: 'https://app.posthog.com',
    desc: 'PostHog API host (exposed to browser)',
  }),

  // Build configuration (public)
  NEXT_PUBLIC_BUILD_ID: str({
    default: 'local-dev',
    desc: 'Build ID for version tracking (exposed to browser)',
  }),
  NEXT_PUBLIC_GIT_SHA: str({
    default: 'development',
    desc: 'Git commit SHA (exposed to browser)',
  }),
});

/**
 * Type-safe environment variables
 */
export type Env = typeof env;
