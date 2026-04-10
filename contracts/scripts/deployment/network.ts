import { StacksMainnet, StacksNetwork, StacksTestnet } from '@stacks/network';

import { StacksNetworkName } from './types';

export function createStacksNetwork(network: StacksNetworkName, url: string): StacksNetwork {
  if (network === 'mainnet') {
    return new StacksMainnet({ url });
  }

  return new StacksTestnet({ url });
}

export function normalizeNodeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
