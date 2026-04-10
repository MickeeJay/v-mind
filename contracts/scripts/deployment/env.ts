import dotenv from 'dotenv';

import { DeployerEnv, StacksNetworkName } from './types';

dotenv.config({ path: '.env' });

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNetwork(networkValue: string): StacksNetworkName {
  const network = networkValue.toLowerCase();
  if (network === 'mainnet' || network === 'testnet' || network === 'devnet' || network === 'simnet') {
    return network;
  }
  throw new Error(`Invalid STACKS_NETWORK value: ${networkValue}`);
}

export function loadDeployerEnv(): DeployerEnv {
  const deployerAddress = readRequired('DEPLOYER_ADDRESS');
  const deployerPrivateKey = readRequired('DEPLOYER_PRIVATE_KEY');
  const stacksNetwork = parseNetwork(readRequired('STACKS_NETWORK'));
  const stacksNodeUrl = readRequired('STACKS_NODE_URL');

  return {
    deployerAddress,
    deployerPrivateKey,
    stacksNetwork,
    stacksNodeUrl,
    deployConfigPath: process.env.DEPLOY_CONFIG_PATH?.trim(),
    manifestPath: process.env.DEPLOYMENT_MANIFEST_PATH?.trim(),
  };
}
