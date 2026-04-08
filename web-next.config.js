import { env } from './src/lib/env';

// Validate environment variables at build time
// This ensures missing variables cause the build to fail
// rather than producing a broken application
console.log('🔍 Validating environment variables...');
try {
  const config = {
    network: env.NEXT_PUBLIC_STACKS_NETWORK,
    apiUrl: env.NEXT_PUBLIC_API_BASE_URL,
  };
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error);
  process.exit(1);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
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
