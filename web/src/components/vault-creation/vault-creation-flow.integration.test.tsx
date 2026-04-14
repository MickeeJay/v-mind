import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VaultCreationFlow } from '@/components/vault-creation/vault-creation-flow';
import { createTestQueryClient } from '@/test/test-utils';

import type { VaultStrategy } from '@/types/vault-creation';

const useWalletMock = vi.fn();
const fetchAvailableStrategiesMock = vi.fn();
const fetchVaultCreationProtocolConfigMock = vi.fn();
const fetchVaultCreationPricingMock = vi.fn();
const fetchWalletBalanceSnapshotMock = vi.fn();
const submitVaultCreationTransactionMock = vi.fn();
const pollVaultCreationConfirmationMock = vi.fn();

vi.mock('@/hooks/use-wallet', () => ({
  useWallet: () => useWalletMock(),
}));

vi.mock('@/lib/vault-creation-api', () => ({
  fetchAvailableStrategies: (...args: unknown[]) => fetchAvailableStrategiesMock(...args),
  fetchVaultCreationProtocolConfig: (...args: unknown[]) => fetchVaultCreationProtocolConfigMock(...args),
  fetchVaultCreationPricing: (...args: unknown[]) => fetchVaultCreationPricingMock(...args),
  fetchWalletBalanceSnapshot: (...args: unknown[]) => fetchWalletBalanceSnapshotMock(...args),
}));

vi.mock('@/lib/vault-creation-transactions', () => ({
  classifyVaultTransactionError: (error: unknown) => error,
  getExplorerTxUrl: (txId: string) => `https://explorer.hiro.so/txid/${txId}?chain=mainnet`,
  pollVaultCreationConfirmation: (...args: unknown[]) => pollVaultCreationConfirmationMock(...args),
  submitVaultCreationTransaction: (...args: unknown[]) => submitVaultCreationTransactionMock(...args),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

function makeStrategy(): VaultStrategy {
  return {
    id: 1n,
    name: 'Adaptive Yield',
    strategyType: 1n,
    riskTier: 2n,
    riskLabel: 'Moderate',
    targetProtocolPrincipal: 'SP3FBR2AGKPDX0ZC7YQ4D6N5Q9J2Q4R6V1Q8B0',
    targetAssetSymbol: 'STX',
    targetAssetMinDepositMicrostx: 1_000_000n,
    estimatedApyRange: '6.00% - 10.50%',
    description: 'Deploys assets to vetted DeFi venues.',
    active: true,
  };
}

function renderFlow(): void {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <VaultCreationFlow />
    </QueryClientProvider>,
  );
}

describe('VaultCreationFlow', () => {
  it('submits the correct contract call and reaches confirmation', async () => {
    const user = userEvent.setup();
    useWalletMock.mockReturnValue({ address: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4' });

    fetchAvailableStrategiesMock.mockResolvedValue([makeStrategy()]);
    fetchVaultCreationProtocolConfigMock.mockResolvedValue({ minimumDepositMicrostx: 1_000_000n, performanceFeeBps: 250n });
    fetchVaultCreationPricingMock.mockResolvedValue({ nextVaultId: 8n, pricePerShareScaled: 1_000_000n, shareScale: 1_000_000n });
    fetchWalletBalanceSnapshotMock.mockResolvedValue({ stxBalanceMicrostx: 5_000_000n });
    submitVaultCreationTransactionMock.mockResolvedValue({ txId: '0xabc123' });
    pollVaultCreationConfirmationMock.mockResolvedValue({ txId: '0xabc123', vaultId: 8n });

    renderFlow();

    await screen.findByText('Adaptive Yield');

    await user.click(screen.getByText('Adaptive Yield').closest('button') as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Continue to deposit' }));

    const depositInput = screen.getByRole('textbox', { name: /Deposit amount/i });
    await user.clear(depositInput);
    await user.type(depositInput, '2.5');
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    await user.click(screen.getByLabelText(/I understand the risks/i));
    await user.click(screen.getByRole('button', { name: 'Confirm and submit' }));

    await waitFor(() => {
      expect(submitVaultCreationTransactionMock).toHaveBeenCalledWith({
        walletAddress: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4',
        assetContractPrincipal: 'SP3FBR2AGKPDX0ZC7YQ4D6N5Q9J2Q4R6V1Q8B0',
        depositMicrostx: 2_500_000n,
        strategyId: 1n,
      });
      expect(pollVaultCreationConfirmationMock).toHaveBeenCalledWith('0xabc123', expect.objectContaining({ signal: expect.any(Object) }));
      expect(screen.getByText('Vault created successfully')).not.toBeNull();
      expect(screen.getByText('#8')).not.toBeNull();
    });
  });
});