export interface MetricsRecorder {
  increment(metricName: string, value?: number): void;
  gauge(metricName: string, value: number): void;
}

export class InMemoryMetricsRecorder implements MetricsRecorder {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly perStrategyExecutionCounts = new Map<string, number>();

  private executionsAttempted = 0;
  private executionsSucceeded = 0;
  private executionsFailed = 0;
  private totalConfirmationLatencyMs = 0;
  private confirmationLatencySamples = 0;
  private pendingTransactionCount = 0;

  increment(metricName: string, value = 1): void {
    const current = this.counters.get(metricName) ?? 0;
    this.counters.set(metricName, current + value);
  }

  gauge(metricName: string, value: number): void {
    this.gauges.set(metricName, value);
  }

  recordExecutionAttempt(strategyType: string): void {
    this.executionsAttempted += 1;
    this.increment('executions_attempted_total', 1);

    const current = this.perStrategyExecutionCounts.get(strategyType) ?? 0;
    this.perStrategyExecutionCounts.set(strategyType, current + 1);
  }

  recordExecutionSuccess(strategyType: string, confirmationLatencyMs: number): void {
    this.executionsSucceeded += 1;
    this.increment('executions_succeeded_total', 1);

    if (Number.isFinite(confirmationLatencyMs) && confirmationLatencyMs >= 0) {
      this.totalConfirmationLatencyMs += confirmationLatencyMs;
      this.confirmationLatencySamples += 1;
    }

    const current = this.perStrategyExecutionCounts.get(strategyType) ?? 0;
    this.perStrategyExecutionCounts.set(strategyType, Math.max(current, 1));
  }

  recordExecutionFailure(strategyType: string): void {
    this.executionsFailed += 1;
    this.increment('executions_failed_total', 1);

    const current = this.perStrategyExecutionCounts.get(strategyType) ?? 0;
    this.perStrategyExecutionCounts.set(strategyType, Math.max(current, 1));
  }

  setPendingTransactionCount(count: number): void {
    this.pendingTransactionCount = Math.max(0, count);
    this.gauge('pending_transactions', this.pendingTransactionCount);
  }

  getAverageConfirmationLatencyMs(): number {
    if (this.confirmationLatencySamples === 0) {
      return 0;
    }

    return this.totalConfirmationLatencyMs / this.confirmationLatencySamples;
  }

  renderPrometheus(): string {
    const lines: string[] = [];

    lines.push('# HELP vmind_agent_executions_attempted_total Total execution attempts.');
    lines.push('# TYPE vmind_agent_executions_attempted_total counter');
    lines.push(`vmind_agent_executions_attempted_total ${this.executionsAttempted}`);

    lines.push('# HELP vmind_agent_executions_succeeded_total Total successful executions.');
    lines.push('# TYPE vmind_agent_executions_succeeded_total counter');
    lines.push(`vmind_agent_executions_succeeded_total ${this.executionsSucceeded}`);

    lines.push('# HELP vmind_agent_executions_failed_total Total failed executions.');
    lines.push('# TYPE vmind_agent_executions_failed_total counter');
    lines.push(`vmind_agent_executions_failed_total ${this.executionsFailed}`);

    lines.push('# HELP vmind_agent_execution_confirmation_latency_ms_avg Average execution confirmation latency in milliseconds.');
    lines.push('# TYPE vmind_agent_execution_confirmation_latency_ms_avg gauge');
    lines.push(`vmind_agent_execution_confirmation_latency_ms_avg ${this.getAverageConfirmationLatencyMs()}`);

    lines.push('# HELP vmind_agent_pending_transactions Current number of pending transactions.');
    lines.push('# TYPE vmind_agent_pending_transactions gauge');
    lines.push(`vmind_agent_pending_transactions ${this.pendingTransactionCount}`);

    lines.push('# HELP vmind_agent_strategy_executions_total Per-strategy execution attempts.');
    lines.push('# TYPE vmind_agent_strategy_executions_total counter');

    const sortedEntries = Array.from(this.perStrategyExecutionCounts.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    for (const [strategyType, count] of sortedEntries) {
      lines.push(`vmind_agent_strategy_executions_total{strategy="${escapePrometheusLabelValue(strategyType)}"} ${count}`);
    }

    return `${lines.join('\n')}\n`;
  }

  snapshot(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    executions: {
      attempted: number;
      succeeded: number;
      failed: number;
      averageConfirmationLatencyMs: number;
      pending: number;
      perStrategy: Record<string, number>;
    };
  } {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      executions: {
        attempted: this.executionsAttempted,
        succeeded: this.executionsSucceeded,
        failed: this.executionsFailed,
        averageConfirmationLatencyMs: this.getAverageConfirmationLatencyMs(),
        pending: this.pendingTransactionCount,
        perStrategy: Object.fromEntries(this.perStrategyExecutionCounts.entries()),
      },
    };
  }
}

function escapePrometheusLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}