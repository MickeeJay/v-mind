export type StacksNetworkName = 'mainnet' | 'testnet' | 'devnet' | 'simnet';

export type DeployContractKind =
  | 'access-control'
  | 'protocol-config'
  | 'strategy-registry'
  | 'vault-receipt-token'
  | 'protocol-adapter'
  | 'vault-core'
  | 'vault-execution-engine';

export interface DeploymentContract {
  name: string;
  kind: DeployContractKind;
  path: string;
}

export interface SupportedAssetConfig {
  assetContract: string;
  symbol: string;
  minDepositMicrostx: string;
  maxDepositMicrostx: string;
  active: boolean;
}

export interface FeeOverrideConfig {
  key: string;
  feeRateBps: string;
  active: boolean;
}

export interface StrategyTypeConfig {
  strategyType: string;
  active: boolean;
}

export interface RoleGrantConfig {
  account: string;
  role: string;
}

export interface StrategyConfig {
  strategyName: string;
  strategyType: string;
  targetProtocol: string;
  riskTier: string;
  authorizedExecutor: string;
}

export interface TokenInitConfig {
  name: string;
  symbol: string;
  decimals: string;
  uri: string | null;
}

export interface InitialConfig {
  roleGrants: RoleGrantConfig[];
  protocolConfig: {
    performanceFeeBps: string;
    maxActiveVaultsPerUser: string;
    minimumDepositMicrostx: string;
    maxStrategyRebalanceFrequencyBlocks: string;
    protocolTreasury: string;
    supportedAssets: SupportedAssetConfig[];
    feeOverrides: FeeOverrideConfig[];
    whitelistedStrategyTypes: StrategyTypeConfig[];
  };
  token: TokenInitConfig;
  strategies: StrategyConfig[];
  vaultMaxAumDropBpsPerTx: string;
}

export interface DeploymentConfig {
  network: StacksNetworkName;
  rpcUrl: string;
  confirmationPollIntervalMs: number;
  confirmationTimeoutMs: number;
  contracts: DeploymentContract[];
  initialConfig: InitialConfig;
}

export interface DeployerEnv {
  deployerAddress: string;
  deployerPrivateKey: string;
  stacksNetwork: StacksNetworkName;
  stacksNodeUrl: string;
  deployConfigPath?: string;
  manifestPath?: string;
}

export interface ManifestContractRecord {
  name: string;
  kind: DeployContractKind;
  contractAddress: string;
  txid: string;
  deployedBlockHeight: number;
  sourcePath: string;
  deployedAt: string;
}

export interface DeploymentManifest {
  network: StacksNetworkName;
  rpcUrl: string;
  deployerAddress: string;
  createdAt: string;
  contracts: ManifestContractRecord[];
}
