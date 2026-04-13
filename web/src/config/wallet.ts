import { WalletConnect } from '@stacks/connect';

import { env } from '@/lib/env';

export type VMindNetwork = 'mainnet' | 'testnet' | 'devnet';

export const VMIND_WALLET_APP_NAME = 'V-Mind';
export const VMIND_WALLET_APP_URL = 'https://v-mind.app';
export const VMIND_WALLET_APP_ICON = `${VMIND_WALLET_APP_URL}/favicon.svg`;

export function getExpectedNetwork(): VMindNetwork {
  return env.NEXT_PUBLIC_STACKS_NETWORK as VMindNetwork;
}

export function getConnectNetwork(): 'mainnet' | 'testnet' {
  const expected = getExpectedNetwork();
  return expected === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getWalletConnectNetworks() {
  if (getExpectedNetwork() === 'mainnet') {
    return [WalletConnect.Networks.Stacks, WalletConnect.Networks.Bitcoin];
  }

  return [
    {
      ...WalletConnect.Networks.Stacks,
      chains: [WalletConnect.Chains.Stacks.Testnet],
    },
    {
      ...WalletConnect.Networks.Bitcoin,
      chains: [WalletConnect.Chains.Bitcoin.Testnet],
    },
  ];
}

export function getWalletConnectConfig() {
  if (!env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    return undefined;
  }

  return {
    projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    metadata: {
      name: VMIND_WALLET_APP_NAME,
      description: 'V-Mind Stacks strategy vaults',
      url: VMIND_WALLET_APP_URL,
      icons: [VMIND_WALLET_APP_ICON],
    },
    networks: getWalletConnectNetworks(),
  };
}
