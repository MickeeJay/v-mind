import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start -- -p 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_STACKS_NETWORK: 'mainnet',
      NEXT_PUBLIC_STACKS_API_URL: 'https://api.testnet.hiro.so',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001',
      NEXT_PUBLIC_API_VERSION: 'v1',
      NEXT_PUBLIC_API_TIMEOUT: '30000',
      NEXT_PUBLIC_DEPLOYER_ADDRESS: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});