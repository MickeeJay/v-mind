export interface VaultState {
  vaultId: string;
  activeStrategyId: string;
  lastExecutionBlock: number;
  enabled: boolean;
}

export interface VaultRegistry {
  listVaults(): Promise<VaultState[]>;
}

export class InMemoryVaultRegistry implements VaultRegistry {
  private readonly vaults: VaultState[];

  constructor(initialVaults: VaultState[]) {
    this.vaults = initialVaults.map((vault) => ({ ...vault }));
  }

  async listVaults(): Promise<VaultState[]> {
    return this.vaults.filter((vault) => vault.enabled).map((vault) => ({ ...vault }));
  }
}