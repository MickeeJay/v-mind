import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AllocationBreakdown } from '@/components/vault-detail/allocation-breakdown';
import type { VaultAllocationEntry } from '@/types/vault-detail';

const useVaultAllocationQueryMock = vi.fn();

vi.mock('@/hooks/use-vault-allocation-query', () => ({
  useVaultAllocationQuery: (...args: unknown[]) => useVaultAllocationQueryMock(...args),
}));

function makeAllocation(overrides: Partial<VaultAllocationEntry> & Pick<VaultAllocationEntry, 'protocolId' | 'protocolLabel' | 'protocolSymbol' | 'color' | 'amountMicrostx' | 'allocationBps'>): VaultAllocationEntry {
  return overrides as VaultAllocationEntry;
}

beforeEach(() => {
  useVaultAllocationQueryMock.mockReset();
});

describe('AllocationBreakdown', () => {
  it('renders the loading skeleton', () => {
    useVaultAllocationQueryMock.mockReturnValue({
      isPending: true,
      isError: false,
      error: null,
      data: undefined,
      refetch: vi.fn(),
    });

    render(<AllocationBreakdown vaultId={1n} />);

    expect(screen.getByText('Allocation breakdown')).not.toBeNull();
    expect(document.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders the empty state when no allocation exists', () => {
    useVaultAllocationQueryMock.mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      data: [],
      refetch: vi.fn(),
    });

    render(<AllocationBreakdown vaultId={1n} />);

    expect(screen.getByText('This vault has not been deployed into any protocol positions yet.')).not.toBeNull();
  });

  it('renders allocation rows and lets the user sort them', async () => {
    useVaultAllocationQueryMock.mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      data: [
        makeAllocation({
          protocolId: 3n,
          protocolLabel: 'StackingDAO',
          protocolSymbol: 'stSTX',
          color: '#8b5cf6',
          amountMicrostx: 750_000n,
          allocationBps: 1500n,
        }),
        makeAllocation({
          protocolId: 1n,
          protocolLabel: 'Zest',
          protocolSymbol: 'ZEST',
          color: '#f7931a',
          amountMicrostx: 2_500_000n,
          allocationBps: 5000n,
        }),
        makeAllocation({
          protocolId: 2n,
          protocolLabel: 'ALEX',
          protocolSymbol: 'ALEX',
          color: '#22c55e',
          amountMicrostx: 1_500_000n,
          allocationBps: 3500n,
        }),
      ],
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    const { container } = render(<AllocationBreakdown vaultId={1n} />);

    expect(screen.getByText('4.75')).not.toBeNull();

    const rowsBeforeSort = container.querySelectorAll('tbody tr');
    expect(rowsBeforeSort[0]?.textContent ?? '').toContain('Zest');
    expect(rowsBeforeSort[1]?.textContent ?? '').toContain('ALEX');
    expect(rowsBeforeSort[2]?.textContent ?? '').toContain('StackingDAO');

    await user.click(screen.getByRole('button', { name: /Protocol/i }));

    const rowsAfterSort = container.querySelectorAll('tbody tr');
    expect(rowsAfterSort[0]?.textContent ?? '').toContain('ALEX');
    expect(rowsAfterSort[1]?.textContent ?? '').toContain('StackingDAO');
    expect(rowsAfterSort[2]?.textContent ?? '').toContain('Zest');
  });
});