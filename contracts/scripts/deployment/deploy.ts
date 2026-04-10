import { createStacksNetwork } from './network';
import { loadDeployerEnv } from './env';
import { loadDeploymentConfig } from './config';
import { appendManifestRecord, createManifest, resolveManifestPath, writeManifest } from './manifest';
import { contractIdentifier, readContractSource, resolveContractSourcePath } from './contracts';
import { deployContractTx, waitForTxSuccess } from './transactions';

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function resolveDryRunNodeUrl(): string {
  return process.env.CLARINET_SIMNET_URL?.trim() || 'http://127.0.0.1:3999';
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const env = loadDeployerEnv();
  const config = loadDeploymentConfig(env);

  const effectiveRpcUrl = dryRun ? resolveDryRunNodeUrl() : config.rpcUrl;
  const network = createStacksNetwork(env.stacksNetwork, effectiveRpcUrl);

  const manifestPath = resolveManifestPath(config.network, env.manifestPath);
  let manifest = createManifest(config.network, effectiveRpcUrl, env.deployerAddress);

  console.log(`Starting ${dryRun ? 'dry-run ' : ''}deployment on ${config.network}`);
  console.log(`RPC endpoint: ${effectiveRpcUrl}`);
  console.log(`Deployer: ${env.deployerAddress}`);

  if (dryRun) {
    console.log('Dry-run mode enabled. Transactions are sent to Clarinet simnet RPC only.');
  }

  for (const contract of config.contracts) {
    const sourcePath = resolveContractSourcePath(contract);
    const source = readContractSource(sourcePath);
    const contractAddress = contractIdentifier(env.deployerAddress, contract.name);

    console.log(`\nDeploying ${contract.name} (${contract.kind}) from ${contract.path}`);

    const txid = await deployContractTx(network, env.deployerPrivateKey, contract.name, source);
    console.log(`Broadcasted ${contract.name} tx: ${txid}`);

    const blockHeight = await waitForTxSuccess(
      effectiveRpcUrl,
      txid,
      config.confirmationTimeoutMs,
      config.confirmationPollIntervalMs,
    );

    console.log(`Confirmed ${contract.name} at block ${blockHeight}`);
    console.log(`Contract address: ${contractAddress}`);

    manifest = appendManifestRecord(manifest, {
      name: contract.name,
      kind: contract.kind,
      txid,
      contractAddress,
      deployedBlockHeight: blockHeight,
      sourcePath: contract.path,
      deployedAt: new Date().toISOString(),
    });
  }

  writeManifest(manifestPath, manifest);
  console.log(`\nDeployment completed. Manifest written to: ${manifestPath}`);
}

main().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
