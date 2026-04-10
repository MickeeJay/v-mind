import fs from 'node:fs';
import path from 'node:path';

import { DeployerEnv, DeploymentConfig } from './types';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContractOrder(kinds: string[]): void {
  assert(kinds[0] === 'access-control', 'Contract order mismatch at index 0: expected access-control');
  assert(kinds[1] === 'protocol-config', 'Contract order mismatch at index 1: expected protocol-config');
  assert(kinds[2] === 'strategy-registry', 'Contract order mismatch at index 2: expected strategy-registry');
  assert(kinds[3] === 'vault-receipt-token', 'Contract order mismatch at index 3: expected vault-receipt-token');

  let cursor = 4;
  while (cursor < kinds.length && kinds[cursor] === 'protocol-adapter') {
    cursor += 1;
  }

  assert(cursor > 4, 'Contract order mismatch: at least one protocol-adapter is required after vault-receipt-token.');
  assert(kinds[cursor] === 'vault-core', `Contract order mismatch at index ${cursor}: expected vault-core`);
  assert(
    kinds[cursor + 1] === 'vault-execution-engine',
    `Contract order mismatch at index ${cursor + 1}: expected vault-execution-engine`,
  );
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
  assertContractOrder(kinds);

  return {
    ...config,
    rpcUrl: env.stacksNodeUrl,
  };
}
