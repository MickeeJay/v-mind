"use client";

import * as React from 'react';

type WalletProvider = 'leather' | 'xverse';

interface WalletSession {
  address: string;
  provider: WalletProvider;
  network: 'mainnet' | 'testnet' | 'devnet';
}

const STORAGE_KEY = 'vmind-wallet-session';

type ProviderRequestResult = {
  addresses?: string[];
  result?: {
    addresses?: string[];
  };
  stxAddress?: string;
  address?: string;
};

interface ProviderLike {
  request?: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
}

interface WalletWindow extends Window {
  LeatherProvider?: ProviderLike;
  BitcoinProvider?: ProviderLike;
  XverseProviders?: {
    StacksProvider?: ProviderLike;
  };
}

const FALLBACK_ADDRESSES: Record<WalletProvider, string> = {
  leather: 'ST1XPS6P7G3VJ8Y0W8D7Y2H91F1W6M75A0VMM2Q3N',
  xverse: 'ST2J8EVYHP5AH6QYTS3C2X24RZMEQW39W4PY31M4V',
};

function truncateAddress(address: string): string {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function parseProviderAddress(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as ProviderRequestResult;

  if (parsed.addresses?.length) {
    return parsed.addresses[0] ?? null;
  }

  if (parsed.result?.addresses?.length) {
    return parsed.result.addresses[0] ?? null;
  }

  if (typeof parsed.stxAddress === 'string') {
    return parsed.stxAddress;
  }

  if (typeof parsed.address === 'string') {
    return parsed.address;
  }

  return null;
}

async function resolveProviderAddress(provider: WalletProvider): Promise<string | null> {
  const walletWindow = window as WalletWindow;

  if (provider === 'leather' && walletWindow.LeatherProvider?.request) {
    const value = await walletWindow.LeatherProvider.request('getAddresses').catch(() => null);
    return parseProviderAddress(value);
  }

  if (provider === 'xverse') {
    const client = walletWindow.XverseProviders?.StacksProvider ?? walletWindow.BitcoinProvider;

    if (client?.request) {
      const value = await client.request('getAddresses').catch(() => null);
      return parseProviderAddress(value);
    }
  }

  return null;
}

function getNetwork(): WalletSession['network'] {
  const value = process.env.NEXT_PUBLIC_STACKS_NETWORK;

  if (value === 'mainnet' || value === 'testnet' || value === 'devnet') {
    return value;
  }

  return 'testnet';
}

export function useWallet(): {
  wallet: WalletSession | null;
  shortAddress: string | null;
  isConnecting: boolean;
  connect: (provider: WalletProvider) => Promise<void>;
  disconnect: () => void;
} {
  const [wallet, setWallet] = React.useState<WalletSession | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as WalletSession;

      if (parsed.address && parsed.provider && parsed.network) {
        setWallet(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const connect = React.useCallback(async (provider: WalletProvider) => {
    setIsConnecting(true);

    try {
      const address = (await resolveProviderAddress(provider)) ?? FALLBACK_ADDRESSES[provider];
      const nextWallet: WalletSession = {
        address,
        provider,
        network: getNetwork(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWallet));
      setWallet(nextWallet);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setWallet(null);
  }, []);

  return {
    wallet,
    shortAddress: wallet ? truncateAddress(wallet.address) : null,
    isConnecting,
    connect,
    disconnect,
  };
}
