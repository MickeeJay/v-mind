import {
  ClarityType,
  callReadOnlyFunction,
  noneCV,
  principalCV,
  someCV,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
} from '@stacks/transactions';

import { CORE_CONTRACT_NAMES, RISK_TIER_IDS, ROLE_IDS, STRATEGY_TYPE_IDS } from './constants';
import { loadDeployerEnv } from './env';
import { loadDeploymentConfig } from './config';
import { createStacksNetwork } from './network';
import { readManifest, resolveManifestPath } from './manifest';
import { callPublicFnTx, waitForTxSuccess } from './transactions';
import { DeploymentManifest, RoleGrantConfig, StrategyConfig } from './types';

function parseArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex(item => item === flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function asUInt(value: string): bigint {
  return BigInt(value);
}

function roleToId(role: string): bigint {
  switch (role) {
    case 'owner':
      return ROLE_IDS.owner;
    case 'operator':
      return ROLE_IDS.operator;
    case 'guardian':
      return ROLE_IDS.guardian;
    case 'strategy-registrar':
      return ROLE_IDS.strategyRegistrar;
    default:
      throw new Error(`Unsupported role value: ${role}`);
  }
}

function strategyTypeToId(strategyType: string): bigint {
  switch (strategyType) {
    case 'yield':
      return STRATEGY_TYPE_IDS.yield;
    case 'rebalance':
      return STRATEGY_TYPE_IDS.rebalance;
    case 'dca':
      return STRATEGY_TYPE_IDS.dca;
    case 'exit':
      return STRATEGY_TYPE_IDS.exit;
    default:
      throw new Error(`Unsupported strategy type: ${strategyType}`);
  }
}

function riskTierToId(riskTier: string): bigint {
  switch (riskTier) {
    case 'conservative':
      return RISK_TIER_IDS.conservative;
    case 'moderate':
      return RISK_TIER_IDS.moderate;
    case 'aggressive':
      return RISK_TIER_IDS.aggressive;
    default:
      throw new Error(`Unsupported risk tier: ${riskTier}`);
  }
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

function expectBool(value: unknown, expected: boolean, label: string): void {
  const cv = value as { type: number; value?: unknown };
  const actual = cv.type === ClarityType.BoolTrue ? true : cv.type === ClarityType.BoolFalse ? false : undefined;
  if (actual !== expected) {
    throw new Error(`Verification failed for ${label}. Expected ${expected}, got ${actual}`);
  }
}

function expectUInt(value: unknown, expected: bigint, label: string): void {
  const cv = value as { type: number; value?: unknown };
  if (cv.type !== ClarityType.UInt) {
    throw new Error(`Verification failed for ${label}. Expected UInt CV.`);
  }

  const actual = BigInt(String(cv.value));
  if (actual !== expected) {
    throw new Error(`Verification failed for ${label}. Expected ${expected}, got ${actual}`);
  }
}

function expectPrincipal(value: unknown, expected: string, label: string): void {
  const cv = value as { type: number; value?: string };
  if (cv.type !== ClarityType.PrincipalStandard && cv.type !== ClarityType.PrincipalContract) {
    throw new Error(`Verification failed for ${label}. Expected principal CV.`);
  }

  if (cv.value !== expected) {
    throw new Error(`Verification failed for ${label}. Expected ${expected}, got ${cv.value}`);
  }
}

async function callAndWait(
  rpcUrl: string,
  timeoutMs: number,
  pollIntervalMs: number,
  sendTx: () => Promise<string>,
): Promise<string> {
  const txid = await sendTx();
  console.log(`Broadcasted tx: ${txid}`);
  await waitForTxSuccess(rpcUrl, txid, timeoutMs, pollIntervalMs);
  return txid;
}

async function readOnly(
  network: ReturnType<typeof createStacksNetwork>,
  senderAddress: string,
  contractPrincipal: string,
  functionName: string,
  args: ReturnType<typeof uintCV>[],
): Promise<unknown> {
  const { contractAddress, contractName } = splitContractPrincipal(contractPrincipal);

  return callReadOnlyFunction({
    network,
    senderAddress,
    contractAddress,
    contractName,
    functionName,
    functionArgs: args,
  });
}

async function configureRoles(
  network: ReturnType<typeof createStacksNetwork>,
  manifest: DeploymentManifest,
  senderKey: string,
  senderAddress: string,
  rpcUrl: string,
  timeoutMs: number,
  pollIntervalMs: number,
  roleGrants: RoleGrantConfig[],
): Promise<void> {
  const accessControlPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.accessControl);
  const { contractAddress, contractName } = splitContractPrincipal(accessControlPrincipal);

  for (const grant of roleGrants) {
    console.log(`Granting role ${grant.role} to ${grant.account}`);

    await callAndWait(rpcUrl, timeoutMs, pollIntervalMs, () =>
      callPublicFnTx(network, senderKey, contractAddress, contractName, 'grant-role', [
        principalCV(grant.account),
        uintCV(roleToId(grant.role)),
      ]),
    );

    const hasRole = await readOnly(network, senderAddress, accessControlPrincipal, 'has-role', [
      principalCV(grant.account),
      uintCV(roleToId(grant.role)),
    ] as unknown as ReturnType<typeof uintCV>[]);

    expectBool(hasRole, true, `has-role(${grant.account}, ${grant.role})`);
    console.log(`Verified role ${grant.role} for ${grant.account}`);
  }
}

async function main(): Promise<void> {
  const env = loadDeployerEnv();
  const config = loadDeploymentConfig(env);
  const network = createStacksNetwork(config.network, config.rpcUrl);

  const manifestArg = parseArgValue('--manifest');
  const manifestPath = manifestArg || resolveManifestPath(config.network, env.manifestPath);
  const manifest = readManifest(manifestPath);

  console.log(`Starting post-deployment initialization using manifest: ${manifestPath}`);

  await configureRoles(
    network,
    manifest,
    env.deployerPrivateKey,
    env.deployerAddress,
    config.rpcUrl,
    config.confirmationTimeoutMs,
    config.confirmationPollIntervalMs,
    config.initialConfig.roleGrants,
  );

  const protocolConfigPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.protocolConfig);
  const { contractAddress: protocolConfigAddress, contractName: protocolConfigName } =
    splitContractPrincipal(protocolConfigPrincipal);

  console.log('Setting protocol performance fee');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-protocol-performance-fee-bps', [
      uintCV(asUInt(config.initialConfig.protocolConfig.performanceFeeBps)),
    ]),
  );

  const performanceFee = await callReadOnlyFunction({
    network,
    senderAddress: env.deployerAddress,
    contractAddress: protocolConfigAddress,
    contractName: protocolConfigName,
    functionName: 'get-protocol-performance-fee-bps',
    functionArgs: [],
  });
  expectUInt(performanceFee, asUInt(config.initialConfig.protocolConfig.performanceFeeBps), 'get-protocol-performance-fee-bps');

  console.log('Setting max active vaults per user');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-max-active-vaults-per-user', [
      uintCV(asUInt(config.initialConfig.protocolConfig.maxActiveVaultsPerUser)),
    ]),
  );

  console.log('Setting minimum deposit');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-minimum-deposit-microstx', [
      uintCV(asUInt(config.initialConfig.protocolConfig.minimumDepositMicrostx)),
    ]),
  );

  console.log('Setting max strategy rebalance frequency');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(
      network,
      env.deployerPrivateKey,
      protocolConfigAddress,
      protocolConfigName,
      'set-max-strategy-rebalance-frequency-blocks',
      [uintCV(asUInt(config.initialConfig.protocolConfig.maxStrategyRebalanceFrequencyBlocks))],
    ),
  );

  console.log('Setting protocol treasury');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-protocol-treasury', [
      principalCV(config.initialConfig.protocolConfig.protocolTreasury),
    ]),
  );

  const treasury = await callReadOnlyFunction({
    network,
    senderAddress: env.deployerAddress,
    contractAddress: protocolConfigAddress,
    contractName: protocolConfigName,
    functionName: 'get-protocol-treasury',
    functionArgs: [],
  });
  expectPrincipal(treasury, config.initialConfig.protocolConfig.protocolTreasury, 'get-protocol-treasury');

  for (const asset of config.initialConfig.protocolConfig.supportedAssets) {
    console.log(`Adding supported asset ${asset.symbol} (${asset.assetContract})`);
    await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
      callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'add-supported-asset', [
        principalCV(asset.assetContract),
        stringAsciiCV(asset.symbol),
        uintCV(asUInt(asset.minDepositMicrostx)),
        uintCV(asUInt(asset.maxDepositMicrostx)),
      ]),
    );

    if (!asset.active) {
      await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
        callPublicFnTx(
          network,
          env.deployerPrivateKey,
          protocolConfigAddress,
          protocolConfigName,
          'set-supported-asset-active',
          [principalCV(asset.assetContract), asset.active ? uintCV(1n) : uintCV(0n)] as never,
        ),
      );
    }
  }

  for (const override of config.initialConfig.protocolConfig.feeOverrides) {
    console.log(`Setting fee override ${override.key}`);
    await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
      callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-fee-override', [
        stringAsciiCV(override.key),
        uintCV(asUInt(override.feeRateBps)),
      ]),
    );

    if (!override.active) {
      await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
        callPublicFnTx(network, env.deployerPrivateKey, protocolConfigAddress, protocolConfigName, 'set-fee-override-active', [
          stringAsciiCV(override.key),
          uintCV(0n),
        ] as never),
      );
    }
  }

  for (const strategyType of config.initialConfig.protocolConfig.whitelistedStrategyTypes) {
    console.log(`Whitelisting strategy type ${strategyType.strategyType}`);
    await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
      callPublicFnTx(
        network,
        env.deployerPrivateKey,
        protocolConfigAddress,
        protocolConfigName,
        'add-whitelisted-strategy-type',
        [stringAsciiCV(strategyType.strategyType)],
      ),
    );

    if (!strategyType.active) {
      await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
        callPublicFnTx(
          network,
          env.deployerPrivateKey,
          protocolConfigAddress,
          protocolConfigName,
          'set-whitelisted-strategy-type-active',
          [stringAsciiCV(strategyType.strategyType), uintCV(0n)] as never,
        ),
      );
    }
  }

  const strategyVaultPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyVault);
  const vaultReceiptTokenPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.vaultReceiptToken);
  const { contractAddress: vaultTokenAddress, contractName: vaultTokenName } =
    splitContractPrincipal(vaultReceiptTokenPrincipal);

  console.log('Initializing vault receipt token');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, vaultTokenAddress, vaultTokenName, 'initialize-token', [
      principalCV(strategyVaultPrincipal),
      stringAsciiCV(config.initialConfig.token.name),
      stringAsciiCV(config.initialConfig.token.symbol),
      uintCV(asUInt(config.initialConfig.token.decimals)),
      config.initialConfig.token.uri ? someCV(stringUtf8CV(config.initialConfig.token.uri)) : noneCV(),
    ]),
  );

  const tokenInitialized = await callReadOnlyFunction({
    network,
    senderAddress: env.deployerAddress,
    contractAddress: vaultTokenAddress,
    contractName: vaultTokenName,
    functionName: 'is-initialized',
    functionArgs: [],
  });
  expectBool(tokenInitialized, true, 'vault-receipt-token is-initialized');

  const strategyRegistryPrincipal = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyRegistry);
  const { contractAddress: strategyRegistryAddress, contractName: strategyRegistryName } =
    splitContractPrincipal(strategyRegistryPrincipal);

  let nextExpectedStrategyId = 1n;
  for (const strategy of config.initialConfig.strategies) {
    console.log(`Registering strategy ${strategy.strategyName}`);
    await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
      callPublicFnTx(network, env.deployerPrivateKey, strategyRegistryAddress, strategyRegistryName, 'register-strategy', [
        stringAsciiCV(strategy.strategyName),
        uintCV(strategyTypeToId(strategy.strategyType)),
        principalCV(strategy.targetProtocol),
        uintCV(riskTierToId(strategy.riskTier)),
        principalCV(strategy.authorizedExecutor),
      ]),
    );

    const strategyEntry = await callReadOnlyFunction({
      network,
      senderAddress: env.deployerAddress,
      contractAddress: strategyRegistryAddress,
      contractName: strategyRegistryName,
      functionName: 'get-strategy-by-id',
      functionArgs: [uintCV(nextExpectedStrategyId)],
    });

    const cv = strategyEntry as { type: number };
    if (cv.type !== ClarityType.OptionalSome) {
      throw new Error(`Strategy ${strategy.strategyName} was not registered at id ${nextExpectedStrategyId}.`);
    }

    nextExpectedStrategyId += 1n;
  }

  const strategyVaultPrincipalFromManifest = getContractPrincipal(manifest, CORE_CONTRACT_NAMES.strategyVault);
  const { contractAddress: strategyVaultAddress, contractName: strategyVaultName } =
    splitContractPrincipal(strategyVaultPrincipalFromManifest);

  console.log('Setting strategy-vault max AUM drop threshold');
  await callAndWait(config.rpcUrl, config.confirmationTimeoutMs, config.confirmationPollIntervalMs, () =>
    callPublicFnTx(network, env.deployerPrivateKey, strategyVaultAddress, strategyVaultName, 'set-max-aum-drop-bps-per-tx', [
      uintCV(asUInt(config.initialConfig.vaultMaxAumDropBpsPerTx)),
    ]),
  );

  const maxAumDrop = await callReadOnlyFunction({
    network,
    senderAddress: env.deployerAddress,
    contractAddress: strategyVaultAddress,
    contractName: strategyVaultName,
    functionName: 'get-max-aum-drop-bps-per-tx',
    functionArgs: [],
  });

  const maxAumDropCV = maxAumDrop as { type: number; value?: unknown };
  if (maxAumDropCV.type !== ClarityType.ResponseOk) {
    throw new Error('Expected get-max-aum-drop-bps-per-tx to return ok response.');
  }

  const inner = (maxAumDropCV as { value: { type: number; value: unknown } }).value;
  if (inner.type !== ClarityType.UInt || BigInt(String(inner.value)) !== asUInt(config.initialConfig.vaultMaxAumDropBpsPerTx)) {
    throw new Error('Strategy vault AUM threshold verification failed.');
  }

  console.log('Post-deployment initialization completed successfully.');
}

main().catch(error => {
  console.error('Initialization failed:', error);
  process.exit(1);
});
