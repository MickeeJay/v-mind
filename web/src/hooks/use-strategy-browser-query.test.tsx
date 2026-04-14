import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useStrategyBrowserQuery } from '@/hooks/use-strategy-browser-query';
import { createTestQueryClient } from '@/test/test-utils';

import type { StrategyBrowserStrategy } from '@/types/strategy-browser';

const fetchStrategyBrowserStrategiesMock = vi.fn();

vi.mock('@/lib/strategy-browser-api', () => ({
  fetchStrategyBrowserStrategies: (...args: unknown[]) => fetchStrategyBrowserStrategiesMock(...args),
}));

function makeStrategy(): StrategyBrowserStrategy {
  return {
    id: 1n,
    name: 'Adaptive Yield',
    strategyType: 1n,
    strategyTypeLabel: 'Yield',
    riskTier: 2n,
    riskLabel: 'Moderate',
    targetProtocolPrincipal: 'SP3FBR2AGKPDX0ZC7YQ4D6N5Q9J2Q4R6V1Q8B0',
    targetAssetSymbol: 'STX',
    estimatedApyRange: '6.00% - 10.50%',
    description: 'Deploys assets to vetted DeFi venues.',
    active: true,
    compatibleProtocols: ['Zest lending'],
    executionConditions: ['Vault must remain active and unlocked.'],
    feeStructure: '1.50% performance fee on realized gains.',
    detailedExplanation: 'Adaptive Yield routes vault capital into vetted DeFi venues.',
    historicalPerformance: [{ date: '2026-04-01T00:00:00.000Z', returnPercent: 8.25 }],
  };
}

function QueryProbe(): JSX.Element {
  const query = useStrategyBrowserQuery();

  return (
    <div>
      <p data-testid="status">{query.isPending ? 'pending' : query.isError ? 'error' : 'success'}</p>
      <p data-testid="count">{query.data?.length ?? 0}</p>
      <p data-testid="first">{query.data?.[0]?.name ?? ''}</p>
      <p data-testid="error">{query.error instanceof Error ? query.error.message : ''}</p>
    </div>
  );
}

function renderQuery(): void {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <QueryProbe />
    </QueryClientProvider>,
  );
}

describe('useStrategyBrowserQuery', () => {
  it('returns loading and success states', async () => {
    fetchStrategyBrowserStrategiesMock.mockResolvedValueOnce([makeStrategy()]);

    renderQuery();

    expect(screen.getByTestId('status').textContent).toBe('pending');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
      expect(screen.getByTestId('count').textContent).toBe('1');
      expect(screen.getByTestId('first').textContent).toBe('Adaptive Yield');
    });
  });

  it('returns the error state when the strategy API fails', async () => {
    fetchStrategyBrowserStrategiesMock.mockRejectedValueOnce(new Error('Strategy registry unavailable'));

    renderQuery();

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Strategy registry unavailable');
    });
  });
});