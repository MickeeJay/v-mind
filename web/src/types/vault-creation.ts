export type VaultCreationStep = 1 | 2 | 3 | 4 | 5;

export type StrategyRiskLevel = 'Conservative' | 'Moderate' | 'Aggressive';

export interface VaultStrategy {
  id: bigint;
  name: string;
  strategyType: bigint;
  riskTier: bigint;
  riskLabel: StrategyRiskLevel;
  targetProtocolPrincipal: string;
  targetAssetSymbol: string;
  targetAssetMinDepositMicrostx: bigint;
  estimatedApyRange: string;
  description: string;
  active: boolean;
}

export interface VaultCreationProtocolConfig {
  minimumDepositMicrostx: bigint;
  performanceFeeBps: bigint;
}

export interface VaultCreationPricing {
  nextVaultId: bigint;
  pricePerShareScaled: bigint;
  shareScale: bigint;
}

export interface WalletBalanceSnapshot {
  stxBalanceMicrostx: bigint;
}

export interface VaultCreationSubmissionResult {
  txId: string;
}

export type VaultCreationErrorType = 'wallet-rejection' | 'onchain-failure' | 'network-error';

export interface VaultCreationError {
  type: VaultCreationErrorType;
  title: string;
  message: string;
  details?: string;
}

export interface ConfirmedVaultResult {
  txId: string;
  vaultId: bigint | null;
}
