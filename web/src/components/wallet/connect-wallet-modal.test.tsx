import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectWalletModal } from '@/components/wallet/connect-wallet-modal';

const walletState = {
  address: null as string | null,
  connect: vi.fn(),
  isConnecting: false,
  error: null as string | null,
};

const useWalletMock = vi.fn();
const getInstalledWalletProvidersMock = vi.fn();
const isWalletProviderInstalledMock = vi.fn();

vi.mock('@/hooks/use-wallet', () => ({
  useWallet: () => useWalletMock(),
}));

vi.mock('@/lib/wallet-providers', () => ({
  WALLET_PROVIDER_IDS: {
    leather: 'LeatherProvider',
    xverse: 'XverseProvider',
  },
  getInstalledWalletProviders: (...args: unknown[]) => getInstalledWalletProvidersMock(...args),
  isWalletProviderInstalled: (...args: unknown[]) => isWalletProviderInstalledMock(...args),
}));

beforeEach(() => {
  walletState.address = null;
  walletState.connect.mockReset();
  walletState.isConnecting = false;
  walletState.error = null;
  useWalletMock.mockReturnValue(walletState);
  getInstalledWalletProvidersMock.mockReturnValue([]);
  isWalletProviderInstalledMock.mockImplementation((providerType: string) => providerType === 'leather');
});

describe('ConnectWalletModal', () => {
  it('shows installed wallets and connect actions', async () => {
    getInstalledWalletProvidersMock.mockReturnValue(['leather']);
    isWalletProviderInstalledMock.mockImplementation((providerType: string) => providerType === 'leather');

    render(<ConnectWalletModal open={true} onOpenChange={() => {}} />);

    expect(await screen.findByText('Detected')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Connect Leather/i })).not.toBeNull();
    expect(screen.getAllByRole('link', { name: /Install/i }).length).toBeGreaterThan(0);
  });

  it('shows the no-extension warning and install links when nothing is detected', async () => {
    getInstalledWalletProvidersMock.mockReturnValue([]);
    isWalletProviderInstalledMock.mockReturnValue(false);

    render(<ConnectWalletModal open={true} onOpenChange={() => {}} />);

    expect(await screen.findByText(/No supported extension was detected/i)).not.toBeNull();
    expect(screen.getByRole('link', { name: /Download Leather/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /Download Xverse/i })).not.toBeNull();
  });

  it('disables actions while connecting and renders errors', async () => {
    walletState.isConnecting = true;
    walletState.error = 'Connection refused';
    getInstalledWalletProvidersMock.mockReturnValue(['leather']);
    isWalletProviderInstalledMock.mockReturnValue(true);

    render(<ConnectWalletModal open={true} onOpenChange={() => {}} />);

    const connectingLabel = screen.getAllByText('Connecting...')[0];
    expect(connectingLabel).toBeDefined();
    expect(connectingLabel!.closest('button')?.disabled).toBe(true);
    expect(screen.getByText('Connection refused')).not.toBeNull();
  });

  it('calls connect for an installed wallet', async () => {
    const user = userEvent.setup();
    getInstalledWalletProvidersMock.mockReturnValue(['leather']);
    isWalletProviderInstalledMock.mockReturnValue(true);

    render(<ConnectWalletModal open={true} onOpenChange={() => {}} />);

    await user.click(await screen.findByRole('button', { name: /Connect Leather/i }));

    expect(walletState.connect).toHaveBeenCalledWith('leather');
  });
});