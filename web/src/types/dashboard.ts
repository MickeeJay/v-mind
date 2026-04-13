export type VaultStatus = 'active' | 'paused' | 'cooldown' | 'archived';

export interface VaultPerformancePoint {
  date: string;
  valueUsd: number;
}

export interface DashboardVault {
  id: string;
  name: string;
  strategyName: string;
  balanceBtc: number;
  balanceUsd: number;
  estimatedApy: number;
  yieldEarnedBtc: number;
  lastExecutionAt: string | null;
  status: VaultStatus;
  performance30d: VaultPerformancePoint[];
}

export interface DashboardPortfolioSummary {
  totalAumUsd: number;
  totalYieldBtc: number;
  activeVaults: number;
  performance30d: VaultPerformancePoint[];
}

export interface DashboardVaultResponse {
  owner: string;
  vaults: DashboardVault[];
}
