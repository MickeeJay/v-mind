export type VaultDetailStatus = 'active' | 'paused' | 'closed' | 'emergency' | 'unknown';

export type VaultStrategyTypeLabel = 'Yield' | 'Rebalance' | 'DCA' | 'Exit' | 'Unknown';

export type VaultRiskLabel = 'Conservative' | 'Moderate' | 'Aggressive' | 'Unknown';

export interface VaultStrategyDetail {
  id: bigint;
  name: string;
  strategyType: bigint;
  strategyTypeLabel: VaultStrategyTypeLabel;
  targetProtocolPrincipal: string;
  targetAssetSymbol: string;
  riskTier: bigint;
  riskLabel: VaultRiskLabel;
  active: boolean;
}

export interface VaultDetailSnapshot {
  vaultId: bigint;
  vaultContractPrincipal: string;
  receiptTokenPrincipal: string;
  ownerPrincipal: string;
  assetPrincipal: string;
  strategy: VaultStrategyDetail;
  status: VaultDetailStatus;
  createdAtBlock: bigint;
  createdAt: string | null;
  lastExecutionBlock: bigint | null;
  lastExecutionAt: string | null;
  totalAssetsMicrostx: bigint;
  sharesOutstanding: bigint;
  ownerShareBalance: bigint;
  sharePriceScaled: bigint;
  cumulativeFeesPaidMicrostx: bigint;
  totalAllocatedMicrostx: bigint;
  executionCount: bigint;
  nextExecutableBlock: bigint | null;
  receiptTokenName: string;
  receiptTokenSymbol: string;
}

export interface VaultAllocationEntry {
  protocolId: bigint;
  protocolLabel: string;
  protocolSymbol: string;
  color: string;
  amountMicrostx: bigint;
  allocationBps: bigint;
}

export interface VaultPerformancePoint {
  timestamp: string;
  sharePriceScaled: bigint;
  returnPercent: number;
}

export interface VaultExecutionRecord {
  txId: string;
  executionBlock: bigint;
  executionType: string;
  strategyLabel: string;
  assetsRoutedMicrostx: bigint;
  yieldGeneratedMicrostx: bigint;
  feesPaidMicrostx: bigint;
}

export interface VaultDetailPageData {
  snapshot: VaultDetailSnapshot;
  allocation: VaultAllocationEntry[];
  performance7d: VaultPerformancePoint[];
  performance30d: VaultPerformancePoint[];
  performance90d: VaultPerformancePoint[];
  performanceAll: VaultPerformancePoint[];
  executions: VaultExecutionRecord[];
}
