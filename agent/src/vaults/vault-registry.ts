export interface VaultState {
  vaultId: string;
  activeStrategyId: string;
  lastExecutionBlock: number;
  enabled: boolean;
}

export interface VaultRegistry {
  listVaults(): Promise<VaultState[]>;
}