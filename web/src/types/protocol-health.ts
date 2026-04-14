export type ProtocolHealthStatus = 'operational' | 'degraded' | 'unavailable';

export interface ProtocolHealthSnapshot {
  id: 'zest' | 'alex' | 'stackingdao' | 'hermetica';
  name: string;
  contractPrincipal: string;
  tvlMicrostx: bigint;
  rateLabel: string;
  rateValue: string;
  status: ProtocolHealthStatus;
  lastUpdatedAt: string;
  explorerUrl: string;
}

export interface ProtocolHealthPageData {
  checkedAt: string;
  agentStatus: 'starting' | 'running' | 'degraded' | 'stopped' | 'unavailable';
  protocols: ProtocolHealthSnapshot[];
}
