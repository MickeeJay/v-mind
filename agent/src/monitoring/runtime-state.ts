export type AgentStatus = 'starting' | 'running' | 'degraded' | 'stopped';

export interface AgentRuntimeSnapshot {
  status: AgentStatus;
  lastProcessedBlockHeight: number | null;
  lastProcessedBlockAt: string | null;
  vaultsMonitored: number;
  executionsInCurrentBlock: number;
  pendingTransactions: number;
}

export class AgentRuntimeState {
  private status: AgentStatus = 'starting';
  private lastProcessedBlockHeight: number | null = null;
  private lastProcessedBlockAt: string | null = null;
  private vaultsMonitored = 0;
  private executionsInCurrentBlock = 0;
  private pendingTransactions = 0;

  setStatus(status: AgentStatus): void {
    this.status = status;
  }

  markBlockProcessed(blockHeight: number, observedAt = new Date()): void {
    this.lastProcessedBlockHeight = blockHeight;
    this.lastProcessedBlockAt = observedAt.toISOString();
  }

  setVaultsMonitored(count: number): void {
    this.vaultsMonitored = Math.max(0, count);
  }

  setExecutionsInCurrentBlock(count: number): void {
    this.executionsInCurrentBlock = Math.max(0, count);
  }

  setPendingTransactions(count: number): void {
    this.pendingTransactions = Math.max(0, count);
  }

  snapshot(): AgentRuntimeSnapshot {
    return {
      status: this.status,
      lastProcessedBlockHeight: this.lastProcessedBlockHeight,
      lastProcessedBlockAt: this.lastProcessedBlockAt,
      vaultsMonitored: this.vaultsMonitored,
      executionsInCurrentBlock: this.executionsInCurrentBlock,
      pendingTransactions: this.pendingTransactions,
    };
  }
}
