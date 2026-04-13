import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalletProvider, useWallet } from '@/components/providers/wallet-provider';

const connectMock = vi.fn();
const disconnectMock = vi.fn();
const getLocalStorageMock = vi.fn();
const getSelectedProviderIdMock = vi.fn();
const isConnectedMock = vi.fn();
const setSelectedProviderIdMock = vi.fn();

vi.mock('@stacks/connect', () => {
  return {
    JsonRpcErrorCode: {
      UserCanceled: -31_001,
      UserRejection: -32_000,
    },
    connect: (...args: unknown[]) => connectMock(...args),
    disconnect: (...args: unknown[]) => disconnectMock(...args),
    getLocalStorage: (...args: unknown[]) => getLocalStorageMock(...args),
    getSelectedProviderId: (...args: unknown[]) => getSelectedProviderIdMock(...args),
    isConnected: (...args: unknown[]) => isConnectedMock(...args),
    setSelectedProviderId: (...args: unknown[]) => setSelectedProviderIdMock(...args),
  };
});

function WalletStateProbe(): JSX.Element {
  const wallet = useWallet();

  return (
    <div>
      <p data-testid="address">{wallet.address ?? ''}</p>
      <p data-testid="network">{wallet.network ?? ''}</p>
      <p data-testid="expected-network">{wallet.expectedNetwork}</p>
      <p data-testid="network-mismatch">{wallet.networkMismatch ? 'true' : 'false'}</p>
      <p data-testid="is-connecting">{wallet.isConnecting ? 'true' : 'false'}</p>
      <p data-testid="error">{wallet.error ?? ''}</p>
      <button
        onClick={() => {
          void wallet.connect('leather');
        }}
      >
        connect
      </button>
      <button onClick={wallet.disconnect}>disconnect</button>
    </div>
  );
}

describe('WalletProvider', () => {
  beforeEach(() => {
    connectMock.mockReset();
    disconnectMock.mockReset();
    getLocalStorageMock.mockReset();
    getSelectedProviderIdMock.mockReset();
    isConnectedMock.mockReset();
    setSelectedProviderIdMock.mockReset();

    isConnectedMock.mockReturnValue(false);
    getLocalStorageMock.mockReturnValue(null);
    getSelectedProviderIdMock.mockReturnValue(null);

    Object.assign(window, {
      LeatherProvider: {
        request: vi.fn(),
      },
      XverseProviders: {
        BitcoinProvider: {
          request: vi.fn(),
        },
      },
    });
  });

  it('starts in disconnected state', () => {
    render(
      <WalletProvider>
        <WalletStateProbe />
      </WalletProvider>,
    );

    expect(screen.getByTestId('address').textContent).toBe('');
    expect(screen.getByTestId('network').textContent).toBe('');
    expect(screen.getByTestId('network-mismatch').textContent).toBe('false');
    expect(screen.getByTestId('is-connecting').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('connects successfully and stores address/network state', async () => {
    connectMock.mockResolvedValue({
      addresses: [{ address: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4', publicKey: '02abc' }],
    });

    render(
      <WalletProvider>
        <WalletStateProbe />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'connect' }));

    await waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4');
      expect(screen.getByTestId('network').textContent).toBe('mainnet');
      expect(screen.getByTestId('network-mismatch').textContent).toBe('false');
    });

    expect(setSelectedProviderIdMock).toHaveBeenCalledWith('LeatherProvider');
  });

  it('flags network mismatch when wallet network differs from expected network', async () => {
    connectMock.mockResolvedValue({
      addresses: [{ address: 'ST2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4', publicKey: '03abc' }],
    });

    render(
      <WalletProvider>
        <WalletStateProbe />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'connect' }));

    await waitFor(() => {
      expect(screen.getByTestId('network').textContent).toBe('testnet');
      expect(screen.getByTestId('expected-network').textContent).toBe('mainnet');
      expect(screen.getByTestId('network-mismatch').textContent).toBe('true');
    });
  });

  it('disconnects and clears wallet state', async () => {
    connectMock.mockResolvedValue({
      addresses: [{ address: 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4', publicKey: '02abc' }],
    });

    render(
      <WalletProvider>
        <WalletStateProbe />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'connect' }));

    await waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4');
    });

    fireEvent.click(screen.getByRole('button', { name: 'disconnect' }));

    await waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('');
      expect(screen.getByTestId('network').textContent).toBe('');
    });

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
