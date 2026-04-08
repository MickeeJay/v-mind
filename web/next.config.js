const { cleanEnv, str, url } = require('envalid');

// Validate required public variables at build time without importing TS modules.
const env = cleanEnv(process.env, {
  NEXT_PUBLIC_STACKS_NETWORK: str({
    choices: ['mainnet', 'testnet', 'devnet'],
    default: 'testnet',
  }),
  NEXT_PUBLIC_API_BASE_URL: url({
    default: 'http://localhost:3001',
  }),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,

  // Temporary deploy guard: repository ESLint resolver config currently fails in CI build.
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    typedRoutes: true,
  },

  // Environment variables that should be available in the browser
  env: {
    NEXT_PUBLIC_STACKS_NETWORK: env.NEXT_PUBLIC_STACKS_NETWORK,
    NEXT_PUBLIC_API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL,
  },
};

module.exports = nextConfig;
