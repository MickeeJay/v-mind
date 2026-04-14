import { describe, expect, it } from 'vitest';

import { buildPortfolioSummary } from '@/lib/dashboard-api';

import type { DashboardVault } from '@/types/dashboard';

function makeVault(id: string, status: DashboardVault['status'], balanceUsd: number, yieldBtc: number): DashboardVault {
  return {
    id,
    name: `Vault ${id}`,
    strategyName: 'Adaptive Yield',
    balanceBtc: balanceUsd / 90_000,
    balanceUsd,
    estimatedApy: 9.5,
    yieldEarnedBtc: yieldBtc,
    lastExecutionAt: '2026-04-12T12:00:00.000Z',
    status,
    performance30d: Array.from({ length: 30 }, (_, index) => ({
      date: new Date(2026, 2, index + 1).toISOString(),
      valueUsd: balanceUsd * (0.95 + index * 0.002),
    })),
  };
}

describe('buildPortfolioSummary', () => {
  it('aggregates AUM, yield, and active vault count', () => {
    const vaults: DashboardVault[] = [
      makeVault('1', 'active', 100_000, 0.05),
      makeVault('2', 'paused', 40_000, 0.01),
      makeVault('3', 'active', 25_000, 0.005),
    ];

    const summary = buildPortfolioSummary(vaults);

    expect(summary.totalAumUsd).toBe(165_000);
    expect(summary.totalYieldBtc).toBeCloseTo(0.065, 6);
    expect(summary.activeVaults).toBe(2);
    expect(summary.performance30d).toHaveLength(30);
  });
});
