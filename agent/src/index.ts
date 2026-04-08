import dotenv from 'dotenv';
import { env } from './config/env';

// Load environment variables first
dotenv.config();

// Validate environment variables on startup
// This will throw descriptive errors if any required variables are missing
console.log('🔍 Validating environment variables...');
try {
  // Access env to trigger validation
  const config = {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    stacksNetwork: env.STACKS_NETWORK,
  };
  console.log('✅ Environment validation passed');
  console.log('📋 Configuration:', JSON.stringify(config, null, 2));
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error);
  process.exit(1);
}

console.log('🤖 V-Mind Agent Service Starting...');
console.log('Environment:', env.NODE_ENV);
console.log('Stacks Network:', env.STACKS_NETWORK);
console.log('Port:', env.PORT);

// TODO: Initialize agent services

async function main() {
  try {
    console.log('✅ Agent service initialized successfully');
    // Keep the process running
  } catch (error) {
    console.error('❌ Failed to initialize agent service:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
