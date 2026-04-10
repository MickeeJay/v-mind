import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/adversarial/**/*.test.ts',
    ],
    environment: 'node',
    globals: true,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
