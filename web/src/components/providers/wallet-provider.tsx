"use client";

import * as React from 'react';
import {
  JsonRpcErrorCode,
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  getLocalStorage,
  getSelectedProviderId,
  isConnected,
  setSelectedProviderId,
} from '@stacks/connect';

import { getConnectNetwork, getExpectedNetwork, getWalletConnectConfig, type VMindNetwork } from '@/config/wallet';
import { WALLET_PROVIDER_IDS, type WalletProviderType, resolveWalletProvider } from '@/lib/wallet-providers';

const E2E_WALLET_ADDRESS_KEY = 'vmind-e2e-wallet-address';

interface WalletContextValue {
  address: string | null;
  network: VMindNetwork | null;
  expectedNetwork: VMindNetwork;
  networkMismatch: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (provider: WalletProviderType) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = React.createContext<WalletContextValue | undefined>(undefined);

function readStoredAddress(): string | null {
  const storage = getLocalStorage();
  return storage?.addresses.stx[0]?.address ?? null;
}

function getProviderTypeFromId(providerId: string | null): WalletProviderType | null {
  if (providerId === WALLET_PROVIDER_IDS.leather) {
    return 'leather';
  }

  if (providerId === WALLET_PROVIDER_IDS.xverse) {
    return 'xverse';
  }

  return null;
}

function inferNetworkFromAddress(address: string | null): VMindNetwork | null {
  if (!address) {
    return null;
  }

  const normalized = address.toUpperCase();

  if (normalized.startsWith('SP') || normalized.startsWith('SM')) {
    return 'mainnet';
  }

  if (normalized.startsWith('ST') || normalized.startsWith('SN')) {
    return 'testnet';
  }

  return null;
}

function isNetworkCompatible(expected: VMindNetwork, actual: VMindNetwork | null): boolean {
  if (!actual) {
    return true;
  }

  if (expected === actual) {
    return true;
  }

  if ((expected === 'devnet' && actual === 'testnet') || (expected === 'testnet' && actual === 'devnet')) {
    return true;
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = Number(error.code);

    if (code === JsonRpcErrorCode.UserCanceled || code === JsonRpcErrorCode.UserRejection) {
      return 'Wallet connection was canceled.';
    }
  }

  if (error instanceof Error) {
    if (/cancel|reject/i.test(error.message)) {
      return 'Wallet connection was canceled.';
    }

    return error.message;
  }

  return 'Unable to connect wallet. Please try again.';
}

function getAddressFromConnectResult(addresses: { address: string }[]): string | null {
  const stxAddress = addresses.find((entry) => entry.address.toUpperCase().startsWith('S'))?.address;
  return stxAddress ?? null;
}

function readE2eWalletAddress(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(E2E_WALLET_ADDRESS_KEY)?.trim();
  return stored ? stored : null;
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps): JSX.Element {
  const expectedNetwork = getExpectedNetwork();
  const [address, setAddress] = React.useState<string | null>(() => readE2eWalletAddress());
  const [network, setNetwork] = React.useState<VMindNetwork | null>(() => inferNetworkFromAddress(readE2eWalletAddress()));
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const connect = React.useCallback(async (providerType: WalletProviderType) => {
    const provider = resolveWalletProvider(providerType);

    if (!provider) {
      setError(`${providerType === 'leather' ? 'Leather' : 'Xverse'} wallet extension is not installed.`);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      setSelectedProviderId(WALLET_PROVIDER_IDS[providerType]);

      const response = await stacksConnect({
        provider,
        network: getConnectNetwork(),
        forceWalletSelect: false,
        persistWalletSelect: true,
        enableLocalStorage: true,
        walletConnect: getWalletConnectConfig(),
      });

      const nextAddress = getAddressFromConnectResult(response.addresses);

      if (!nextAddress) {
        throw new Error('No Stacks address was returned by the connected wallet.');
      }

      setAddress(nextAddress);
      setNetwork(inferNetworkFromAddress(nextAddress));
    } catch (connectError) {
      setError(getErrorMessage(connectError));
      throw connectError;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    stacksDisconnect();
    setAddress(null);
    setNetwork(null);
    setError(null);
  }, []);

  React.useEffect(() => {
    if (address) {
      return;
    }

    if (!isConnected()) {
      return;
    }

    const storedAddress = readStoredAddress();

    if (!storedAddress) {
      return;
    }

    setAddress(storedAddress);
    setNetwork(inferNetworkFromAddress(storedAddress));

    const selectedProviderType = getProviderTypeFromId(getSelectedProviderId());

    if (!selectedProviderType) {
      return;
    }

    const provider = resolveWalletProvider(selectedProviderType);

    if (!provider) {
      return;
    }

    void stacksConnect({
      provider,
      network: getConnectNetwork(),
      forceWalletSelect: false,
      persistWalletSelect: true,
      enableLocalStorage: true,
      walletConnect: getWalletConnectConfig(),
    })
      .then((result) => {
        const nextAddress = getAddressFromConnectResult(result.addresses) ?? storedAddress;
        setAddress(nextAddress);
        setNetwork(inferNetworkFromAddress(nextAddress));
      })
      .catch(() => {
        // Keep the stored address in place even if silent refresh fails.
      });
  }, []);

  const value = React.useMemo<WalletContextValue>(() => {
    return {
      address,
      network,
      expectedNetwork,
      networkMismatch: !isNetworkCompatible(expectedNetwork, network),
      isConnecting,
      error,
      connect,
      disconnect,
    };
  }, [address, connect, disconnect, error, expectedNetwork, isConnecting, network]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = React.useContext(WalletContext);

  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }

  return context;
}
