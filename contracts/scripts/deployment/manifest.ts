import fs from 'node:fs';
import path from 'node:path';

import { DeploymentManifest, ManifestContractRecord, StacksNetworkName } from './types';

function timestampFilePart(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function resolveManifestPath(network: StacksNetworkName, explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const fileName = `deployment-manifest-${network}-${timestampFilePart(new Date())}.json`;
  return path.resolve('deployments', 'manifests', fileName);
}

export function writeManifest(manifestPath: string, manifest: DeploymentManifest): void {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

export function createManifest(network: StacksNetworkName, rpcUrl: string, deployerAddress: string): DeploymentManifest {
  return {
    network,
    rpcUrl,
    deployerAddress,
    createdAt: new Date().toISOString(),
    contracts: [],
  };
}

export function appendManifestRecord(
  manifest: DeploymentManifest,
  contract: ManifestContractRecord,
): DeploymentManifest {
  return {
    ...manifest,
    contracts: [...manifest.contracts, contract],
  };
}

export function readManifest(manifestPath: string): DeploymentManifest {
  const content = fs.readFileSync(path.resolve(manifestPath), 'utf8');
  return JSON.parse(content) as DeploymentManifest;
}
