export interface ChainTip {
  blockHeight: number;
  blockHash?: string;
  burnBlockHeight?: number;
}

export interface BlockchainClient {
  getChainTip(): Promise<ChainTip>;
}