import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DashboardPage from '@/app/dashboard/page';
import { createTestQueryClient } from '@/test/test-utils';

const useWalletMock = vi.fn();
const fetchDashboardVaultsMock = vi.fn();

vi.mock('@/hooks/use-wallet', () => ({
  useWallet: () => useWalletMock(),
}));

vi.mock('@/lib/dashboard-api', () => ({
  fetchDashboardVaults: (...args: unknown[]) => fetchDashboardVaultsMock(...args),
  buildPortfolioSummary: (vaults: unknown[]) => ({
    totalAumUsd: (vaults as Array<{ balanceUsd: number }>).reduce((sum, vault) => sum + vault.balanceUsd, 0),
    totalYieldBtc: (vaults as Array<{ yieldEarnedBtc: number }>).reduce((sum, vault) => sum + vault.yieldEarnedBtc, 0),
    activeVaults: (vaults as Array<{ status: string }>).filter((vault) => vault.status === 'active').length,
    performance30d: [],
  }),
}));

function renderDashboard(): void {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders the empty state when no vaults are returned', async () => {
    useWalletMock.mockReturnValue({ address: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4' });
    fetchDashboardVaultsMock.mockResolvedValueOnce({ owner: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4', vaults: [] });

    renderDashboard();

    expect(await screen.findByText('No vaults found for this wallet')).not.toBeNull();
  });

  it('renders summary cards for multiple vaults', async () => {
    useWalletMock.mockReturnValue({ address: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4' });
    fetchDashboardVaultsMock.mockResolvedValueOnce({
      owner: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4',
      vaults: [
        {
          id: 'vault-1',
          name: 'Alpha Vault',
          strategyName: 'Adaptive Yield',
          balanceBtc: 0.5,
          balanceUsd: 45_000,
          estimatedApy: 9.2,
          yieldEarnedBtc: 0.015,
          lastExecutionAt: '2026-04-12T12:00:00.000Z',
          status: 'active',
          performance30d: [{ date: '2026-04-01T00:00:00.000Z', valueUsd: 44_000 }],
        },
        {
          id: 'vault-2',
          name: 'Beta Vault',
          strategyName: 'Rebalance Core',
          balanceBtc: 0.25,
          balanceUsd: 24_000,
          estimatedApy: 7.8,
          yieldEarnedBtc: 0.009,
          lastExecutionAt: '2026-04-13T12:00:00.000Z',
          status: 'paused',
          performance30d: [{ date: '2026-04-01T00:00:00.000Z', valueUsd: 23_500 }],
        },
      ],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alpha Vault')).not.toBeNull();
      expect(screen.getByText('Beta Vault')).not.toBeNull();
      expect(screen.getByText('Portfolio performance and active vaults')).not.toBeNull();
      expect(screen.getByText('Active: 1')).not.toBeNull();
    });
  });
});