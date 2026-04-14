import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/test-utils';
import { useVaultAllocationQuery } from '@/hooks/use-vault-allocation-query';

const fetchVaultAllocationMock = vi.fn();

vi.mock('@/lib/vault-detail-api', () => ({
  fetchVaultAllocation: (...args: unknown[]) => fetchVaultAllocationMock(...args),
}));

function QueryProbe({ vaultId }: { vaultId: bigint }): JSX.Element {
  const query = useVaultAllocationQuery(vaultId);

  return (
    <div>
      <p data-testid="status">{query.isPending ? 'pending' : query.isError ? 'error' : 'success'}</p>
      <p data-testid="count">{query.data?.length ?? 0}</p>
      <p data-testid="error">{query.error instanceof Error ? query.error.message : ''}</p>
    </div>
  );
}

function renderQuery(vaultId: bigint): void {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <QueryProbe vaultId={vaultId} />
    </QueryClientProvider>,
  );
}

describe('useVaultAllocationQuery', () => {
  it('returns loading and success states', async () => {
    fetchVaultAllocationMock.mockResolvedValueOnce([
      {
        protocolId: 1n,
        protocolLabel: 'Zest',
        protocolSymbol: 'ZEST',
        color: '#f7931a',
        amountMicrostx: 1_500_000n,
        allocationBps: 6000n,
      },
    ]);

    renderQuery(42n);

    expect(screen.getByTestId('status').textContent).toBe('pending');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('returns the error state when allocation loading fails', async () => {
    fetchVaultAllocationMock.mockRejectedValueOnce(new Error('Allocation unavailable'));

    renderQuery(42n);

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Allocation unavailable');
    });
  });
});