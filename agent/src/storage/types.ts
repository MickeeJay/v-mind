export type ExecutionHistoryStatus = 'confirmed' | 'failed';

export type ProtocolHealthStatus = 'operational' | 'degraded' | 'unavailable';

export interface ExecutionHistoryInsert {
  txId: string;
  vaultId: string;
  strategyId: string;
  strategyType: string;
  status: ExecutionHistoryStatus;
  observedBlockHeight: number;
  submittedBlockHeight: number | null;
  attempts: number;
  confirmations: number;
  nonce: number;
  feeMicrostx: number;
  evaluationReason: string;
  errorMessage: string | null;
  completedAt: string;
}

export interface PortfolioSnapshotInsert {
  ownerAddress: string;
  blockHeight: number;
  capturedAt: string;
  totalAumMicrostx: number;
  totalYieldMicrostx: number;
  activeVaults: number;
  vaultCount: number;
}

export interface ProtocolHealthCheckInsert {
  checkPassId: string;
  protocolId: string;
  protocolName: string;
  status: ProtocolHealthStatus;
  healthy: boolean;
  reason: string;
  detailsJson: string;
  blockHeight: number;
  checkedAt: string;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}