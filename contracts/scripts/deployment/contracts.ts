import fs from 'node:fs';
import path from 'node:path';

import { DeploymentContract } from './types';

export function readContractSource(contractPath: string): string {
  const absolute = path.resolve(contractPath);
  return fs.readFileSync(absolute, 'utf8');
}

export function contractIdentifier(deployerAddress: string, contractName: string): string {
  return `${deployerAddress}.${contractName}`;
}

export function resolveContractSourcePath(contract: DeploymentContract): string {
  return path.resolve(contract.path);
}
