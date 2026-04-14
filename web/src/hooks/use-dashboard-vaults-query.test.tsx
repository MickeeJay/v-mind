import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDashboardVaultsQuery } from '@/hooks/use-dashboard-vaults-query';
import { createTestQueryClient } from '@/test/test-utils';

const fetchDashboardVaultsMock = vi.fn();

vi.mock('@/lib/dashboard-api', () => ({
  fetchDashboardVaults: (...args: unknown[]) => fetchDashboardVaultsMock(...args),
}));

function QueryProbe({ ownerAddress }: { ownerAddress: string | null }): JSX.Element {
  const query = useDashboardVaultsQuery(ownerAddress);

  return (
    <div>
      <p data-testid="status">{query.isPending ? 'pending' : query.isError ? 'error' : 'success'}</p>
      <p data-testid="owner">{query.data?.owner ?? ''}</p>
      <p data-testid="count">{query.data?.vaults.length ?? 0}</p>
      <p data-testid="error">{query.error instanceof Error ? query.error.message : ''}</p>
    </div>
  );
}

function renderQuery(ownerAddress: string | null): void {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <QueryProbe ownerAddress={ownerAddress} />
    </QueryClientProvider>,
  );
}

describe('useDashboardVaultsQuery', () => {
  it('stays idle when no wallet address is available', () => {
    renderQuery(null);

    expect(screen.getByTestId('status').textContent).toBe('pending');
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(fetchDashboardVaultsMock).not.toHaveBeenCalled();
  });

  it('returns loading and success states', async () => {
    fetchDashboardVaultsMock.mockResolvedValueOnce({
      owner: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4',
      vaults: [{ id: 'vault-1' }],
    });

    renderQuery('SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4');

    expect(screen.getByTestId('status').textContent).toBe('pending');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
      expect(screen.getByTestId('owner').textContent).toBe('SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4');
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('returns the error state when the API fails', async () => {
    fetchDashboardVaultsMock.mockRejectedValueOnce(new Error('Dashboard unavailable'));

    renderQuery('SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Dashboard unavailable');
    });
  });
});