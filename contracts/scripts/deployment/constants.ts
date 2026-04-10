export const ROLE_IDS = {
  owner: 1n,
  operator: 2n,
  guardian: 3n,
  strategyRegistrar: 4n,
} as const;

export const STRATEGY_TYPE_IDS = {
  yield: 1n,
  rebalance: 2n,
  dca: 3n,
  exit: 4n,
} as const;

export const RISK_TIER_IDS = {
  conservative: 1n,
  moderate: 2n,
  aggressive: 3n,
} as const;

export const CORE_CONTRACT_NAMES = {
  accessControl: 'access-control',
  protocolConfig: 'protocol-config',
  strategyRegistry: 'strategy-registry',
  vaultReceiptToken: 'vault-receipt-token',
  strategyVault: 'vault-core',
  strategyExecution: 'strategy-execution',
} as const;

export const ADAPTER_CONTRACT_NAMES = [
  'zest-protocol-adapter',
  'alex-liquidity-adapter',
  'stackingdao-adapter',
  'hermetica-adapter',
] as const;
