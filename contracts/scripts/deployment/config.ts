import fs from 'node:fs';
import path from 'node:path';

import { DeployerEnv, DeploymentConfig } from './types';

const REQUIRED_ORDER = [
  'access-control',
  'protocol-config',
  'strategy-registry',
  'vault-receipt-token',
  'protocol-adapter',
  'vault-core',
  'vault-execution-engine',
] as const;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveConfigPath(env: DeployerEnv): string {
  if (env.deployConfigPath) {
    return path.resolve(env.deployConfigPath);
  }

  return path.resolve('deployments', 'config', `${env.stacksNetwork}.json`);
}

function applyEnvTokens(raw: string, env: DeployerEnv): string {
  return raw
    .replaceAll('${DEPLOYER_ADDRESS}', env.deployerAddress)
    .replaceAll('${STACKS_NODE_URL}', env.stacksNodeUrl);
}

export function loadDeploymentConfig(env: DeployerEnv): DeploymentConfig {
  const configPath = resolveConfigPath(env);
  const configRaw = applyEnvTokens(fs.readFileSync(configPath, 'utf8'), env);
  const config = JSON.parse(configRaw) as DeploymentConfig;

  assert(config.network === env.stacksNetwork, `Config network mismatch: expected ${env.stacksNetwork}, got ${config.network}`);
  assert(Array.isArray(config.contracts) && config.contracts.length > 0, 'Deployment config must include contracts.');

  const kinds = config.contracts.map(contract => contract.kind);

  for (let index = 0; index < REQUIRED_ORDER.length; index += 1) {
    assert(
      kinds[index] === REQUIRED_ORDER[index],
      `Contract order mismatch at index ${index}: expected ${REQUIRED_ORDER[index]}, got ${kinds[index]}`,
    );
  }

  return {
    ...config,
    rpcUrl: env.stacksNodeUrl,
  };
}
