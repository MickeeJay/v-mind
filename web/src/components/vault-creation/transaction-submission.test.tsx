import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransactionPendingStep } from '@/components/vault-creation/transaction-pending-step';
import { VaultCreationSuccessStep } from '@/components/vault-creation/vault-creation-success-step';

describe('Vault transaction submission states', () => {
  it('renders the pending transaction state', () => {
    render(
      <TransactionPendingStep
        txId="0xabc123"
        explorerTxUrl="https://explorer.hiro.so/txid/0xabc123?chain=mainnet"
        polling={true}
        error={null}
        onRetryPolling={() => {}}
        onBackToReview={() => {}}
      />,
    );

    expect(screen.getByText('Transaction pending')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Waiting for confirmation on Stacks network.');
    expect(screen.getByRole('link', { name: 'View on Stacks Explorer' }).getAttribute('href')).toBe(
      'https://explorer.hiro.so/txid/0xabc123?chain=mainnet',
    );
  });

  it('renders the confirmed vault creation state', () => {
    render(<VaultCreationSuccessStep vaultId={17n} />);

    expect(screen.getByText('Vault created successfully')).not.toBeNull();
    expect(screen.getByText('#17')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'View vault details' }).getAttribute('href')).toBe('/vaults/17');
  });
});