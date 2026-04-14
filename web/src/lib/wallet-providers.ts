import type { StacksProvider } from '@stacks/connect';

export type WalletProviderType = 'leather' | 'xverse';

export const WALLET_PROVIDER_IDS: Record<WalletProviderType, string> = {
  leather: 'LeatherProvider',
  xverse: 'XverseProviders.BitcoinProvider',
};

interface WalletWindow extends Window {
  LeatherProvider?: StacksProvider;
  XverseProviders?: {
    BitcoinProvider?: StacksProvider;
  };
  BitcoinProvider?: StacksProvider;
}

function getWalletWindow(): WalletWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window as WalletWindow;
}

export function resolveWalletProvider(provider: WalletProviderType): StacksProvider | null {
  const walletWindow = getWalletWindow();

  if (!walletWindow) {
    return null;
  }

  if (provider === 'leather') {
    return walletWindow.LeatherProvider ?? null;
  }

  return walletWindow.XverseProviders?.BitcoinProvider ?? walletWindow.BitcoinProvider ?? null;
}

export function isWalletProviderInstalled(provider: WalletProviderType): boolean {
  return resolveWalletProvider(provider) !== null;
}

export function getInstalledWalletProviders(): WalletProviderType[] {
  const providers: WalletProviderType[] = [];

  if (isWalletProviderInstalled('leather')) {
    providers.push('leather');
  }

  if (isWalletProviderInstalled('xverse')) {
    providers.push('xverse');
  }

  return providers;
}
