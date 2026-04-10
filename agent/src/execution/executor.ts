export interface ExecutionRequest {
  vaultId: string;
  strategyId: string;
  payload: Record<string, unknown>;
}

export interface StrategyExecutor {
  execute(request: ExecutionRequest): Promise<string>;
}