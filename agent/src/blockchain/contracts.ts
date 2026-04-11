export interface ContractReference {
  address: string;
  name: string;
}

export interface BlockchainContracts {
  vaultCore: ContractReference;
  strategyRegistry: ContractReference;
}

export function parseContractIdentifier(identifier: string): ContractReference {
  const [address, name] = identifier.split('.');
  if (!address || !name) {
    throw new Error('Contract identifier must be in <address>.<contract-name> format');
  }

  return { address, name };
}

export function toContractIdentifier(reference: ContractReference): string {
  return `${reference.address}.${reference.name}`;
}
