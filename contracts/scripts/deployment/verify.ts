import { ClarityType, ClarityValue, callReadOnlyFunction, principalCV, stringAsciiCV, uintCV } from '@stacks/transactions';

import { CORE_CONTRACT_NAMES } from './constants';
import { loadDeployerEnv } from './env';
import { loadDeploymentConfig } from './config';
import { createStacksNetwork, normalizeNodeUrl } from './network';
import { readManifest, resolveManifestPath } from './manifest';
import { DeploymentManifest } from './types';

function parseArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex(item => item === flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function splitContractPrincipal(contractPrincipal: string): { contractAddress: string; contractName: string } {
  const [contractAddress, contractName] = contractPrincipal.split('.');
  if (!contractAddress || !contractName) {
    throw new Error(`Invalid contract principal: ${contractPrincipal}`);
  }

  return { contractAddress, contractName };
}

function getContractPrincipal(manifest: DeploymentManifest, name: string): string {
  const found = manifest.contracts.find(contract => contract.name === name);
  if (!found) {
    throw new Error(`Contract ${name} not found in manifest.`);
  }

  return found.contractAddress;
}

function asUInt(value: string): bigint {
  return BigInt(value);
}

async function assertContractExists(rpcUrl: string, contractPrincipal: string): Promise<boolean> {
  const { contractAddress, contractName } = splitContractPrincipal(contractPrincipal);
  const response = await fetch(`${normalizeNodeUrl(rpcUrl)}/v2/contracts/source/${contractAddress}/${contractName}`);
  return response.ok;
}

async function readOnly(
  network: ReturnType<typeof createStacksNetwork>,
  senderAddress: string,
  contractPrincipal: string,
  functionName: string,
  functionArgs: ClarityValue[],
): Promise<unknown> {
  const { contractAddress, contractName } = splitContractPrincipal(contractPrincipal);

  return callReadOnlyFunction({
    network,
    senderAddress,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
  });
}

function compareUInt(result: unknown, expected: bigint): boolean {
  const cv = result as { type: number; value?: unknown };
  return cv.type === ClarityType.UInt && BigInt(String(cv.value)) === expected;
}

function comparePrincipal(result: unknown, expected: string): boolean {
  const cv = result as { type: number; value?: unknown };
  if (cv.type !== ClarityType.PrincipalStandard && cv.type !== ClarityType.PrincipalContract) {
    return false;
  }

  return String(cv.value) === expected;
}

function compareBool(result: unknown, expected: boolean): boolean {
  const cv = result as { type: number };
  return expected ? cv.type === ClarityType.BoolTrue : cv.type === ClarityType.BoolFalse;
}

async function main(): Promise<void> {
  const env = loadDeployerEnv();
  const config = loadDeploymentConfig(env);
  const network = createStacksNetwork(config.network, config.rpcUrl);

  const manifestArg = parseArgValue('--manifest');
  const manifestPath = manifestArg || resolveManifestPath(config.network, env.manifestPath);
  const manifest = readManifest(manifestPath);

  const discrepancies: string[] = [];

  console.log(`Verifying deployment from manifest: ${manifestPath}`);

  for (const contract of manifest.contracts) {
    const exists = await assertContractExists(config.rpcUrl, contract.contractAddress);
    if (!exists) {
      discrepancies.push(`Missing deployed contract source for ${contract.contractAddress}`);
    }
  }

  const accessControlPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.accessControl);
  const owner = await readOnly(network, env.deployerAddress, accessControlPrincipal, 'get-owner', []);
  if (!comparePrincipal(owner, env.deployerAddress)) {
    discrepancies.push(`access-control.get-owner mismatch. Expected ${env.deployerAddress}`);
  }

  const protocolConfigPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.protocolConfig);
  const performanceFee = await readOnly(
    network,
    env.deployerAddress,
    protocolConfigPrincipal,
    'get-protocol-performance-fee-bps',
    [],
  );
  if (!compareUInt(performanceFee, asUInt(config.initialConfig.protocolConfig.performanceFeeBps))) {
    discrepancies.push('protocol-config.get-protocol-performance-fee-bps mismatch.');
  }

  const minDeposit = await readOnly(
    network,
    env.deployerAddress,
    protocolConfigPrincipal,
    'get-minimum-deposit-microstx',
    [],
  );
  if (!compareUInt(minDeposit, asUInt(config.initialConfig.protocolConfig.minimumDepositMicrostx))) {
    discrepancies.push('protocol-config.get-minimum-deposit-microstx mismatch.');
  }

  const maxFrequency = await readOnly(
    network,
    env.deployerAddress,
    protocolConfigPrincipal,
    'get-max-strategy-rebalance-frequency-blocks',
    [],
  );
  if (!compareUInt(maxFrequency, asUInt(config.initialConfig.protocolConfig.maxStrategyRebalanceFrequencyBlocks))) {
    discrepancies.push('protocol-config.get-max-strategy-rebalance-frequency-blocks mismatch.');
  }

  const treasury = await readOnly(network, env.deployerAddress, protocolConfigPrincipal, 'get-protocol-treasury', []);
  if (!comparePrincipal(treasury, config.initialConfig.protocolConfig.protocolTreasury)) {
    discrepancies.push(`protocol-config.get-protocol-treasury mismatch. Expected ${config.initialConfig.protocolConfig.protocolTreasury}.`);
  }

  for (const asset of config.initialConfig.protocolConfig.supportedAssets) {
    const assetEntry = await readOnly(network, env.deployerAddress, protocolConfigPrincipal, 'get-supported-asset', [
      principalCV(asset.assetContract),
    ]);

    const cv = assetEntry as { type: number; value?: unknown };
    if (cv.type !== ClarityType.OptionalSome) {
      discrepancies.push(`protocol-config.get-supported-asset missing for ${asset.assetContract}`);
    }
  }

  const strategyRegistryPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyRegistry);
  const totalStrategies = await readOnly(network, env.deployerAddress, strategyRegistryPrincipal, 'get-total-strategies', []);
  if (!compareUInt(totalStrategies, BigInt(config.initialConfig.strategies.length))) {
    discrepancies.push(`strategy-registry.get-total-strategies mismatch. Expected ${config.initialConfig.strategies.length}.`);
  }

  for (let index = 0; index < config.initialConfig.strategies.length; index += 1) {
    const strategy = config.initialConfig.strategies[index];
    const strategyId = BigInt(index + 1);
    const strategyEntry = await readOnly(network, env.deployerAddress, strategyRegistryPrincipal, 'get-strategy-by-id', [
      uintCV(strategyId),
    ]);

    const cv = strategyEntry as { type: number; value?: unknown };
    if (cv.type !== ClarityType.OptionalSome) {
      discrepancies.push(`strategy-registry.get-strategy-by-id missing id ${strategyId}.`);
      continue;
    }

    const isActive = await readOnly(network, env.deployerAddress, strategyRegistryPrincipal, 'is-strategy-active', [
      uintCV(strategyId),
    ]);
    if (!compareBool(isActive, true)) {
      discrepancies.push(`strategy-registry.is-strategy-active false for id ${strategyId} (${strategy.strategyName}).`);
    }
  }

  const vaultReceiptTokenPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.vaultReceiptToken);
  const tokenInitialized = await readOnly(network, env.deployerAddress, vaultReceiptTokenPrincipal, 'is-initialized', []);
  if (!compareBool(tokenInitialized, true)) {
    discrepancies.push('vault-receipt-token.is-initialized mismatch.');
  }

  const strategyVaultPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyVault);
  const vaultCoreContract = await readOnly(
    network,
    env.deployerAddress,
    vaultReceiptTokenPrincipal,
    'get-vault-core-contract',
    [],
  );
  if (!comparePrincipal(vaultCoreContract, strategyVaultPrincipal)) {
    discrepancies.push(`vault-receipt-token.get-vault-core-contract mismatch. Expected ${strategyVaultPrincipal}.`);
  }

  const tokenName = await readOnly(network, env.deployerAddress, vaultReceiptTokenPrincipal, 'get-name', []);
  const tokenNameCv = tokenName as { type: number; value?: unknown };
  if (tokenNameCv.type !== ClarityType.ResponseOk) {
    discrepancies.push('vault-receipt-token.get-name did not return ok response.');
  } else {
    const inner = tokenNameCv.value as { type: number; data?: string };
    if (inner.type !== ClarityType.StringASCII || inner.data !== config.initialConfig.token.name) {
      discrepancies.push(`vault-receipt-token.get-name mismatch. Expected ${config.initialConfig.token.name}.`);
    }
  }

  const strategyVaultAum = await readOnly(
    network,
    env.deployerAddress,
    strategyVaultPrincipal,
    'get-max-aum-drop-bps-per-tx',
    [],
  );
  const strategyVaultAumCv = strategyVaultAum as { type: number; value?: unknown };
  if (strategyVaultAumCv.type !== ClarityType.ResponseOk) {
    discrepancies.push('strategy-vault.get-max-aum-drop-bps-per-tx did not return ok response.');
  } else {
    const inner = strategyVaultAumCv.value as { type: number; value?: unknown };
    if (inner.type !== ClarityType.UInt || BigInt(String(inner.value)) !== asUInt(config.initialConfig.vaultMaxAumDropBpsPerTx)) {
      discrepancies.push('strategy-vault.get-max-aum-drop-bps-per-tx mismatch.');
    }
  }

  const strategyExecutionPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyExecution);
  const cooldown = await readOnly(network, env.deployerAddress, strategyExecutionPrincipal, 'get-cooldown-blocks', []);
  if (!compareUInt(cooldown, asUInt(config.initialConfig.protocolConfig.maxStrategyRebalanceFrequencyBlocks))) {
    discrepancies.push('strategy-execution.get-cooldown-blocks mismatch.');
  }

  const performanceFeeBps = await readOnly(network, env.deployerAddress, strategyExecutionPrincipal, 'get-performance-fee-bps', []);
  if (!compareUInt(performanceFeeBps, asUInt(config.initialConfig.protocolConfig.performanceFeeBps))) {
    discrepancies.push('strategy-execution.get-performance-fee-bps mismatch.');
  }

  const whitelistedType = config.initialConfig.protocolConfig.whitelistedStrategyTypes[0];
  if (whitelistedType) {
    const whitelistEntry = await readOnly(
      network,
      env.deployerAddress,
      protocolConfigPrincipal,
      'get-whitelisted-strategy-type',
      [stringAsciiCV(whitelistedType.strategyType)],
    );

    const cv = whitelistEntry as { type: number; value?: unknown };
    if (cv.type !== ClarityType.OptionalSome) {
      discrepancies.push(`protocol-config.get-whitelisted-strategy-type missing ${whitelistedType.strategyType}`);
    }
  }

  if (discrepancies.length > 0) {
    console.error('Verification completed with discrepancies:');
    for (const discrepancy of discrepancies) {
      console.error(`- ${discrepancy}`);
    }
    process.exit(1);
  }

  console.log('Verification completed successfully. No discrepancies found.');
}

main().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
