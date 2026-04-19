import { describe, expect, it } from 'vitest';

import { InMemoryMetricsRecorder } from './metrics';

describe('InMemoryMetricsRecorder', () => {
  it('tracks execution counters and pending transactions', () => {
    const metrics = new InMemoryMetricsRecorder();

    metrics.recordExecutionAttempt('yield-optimiser');
    metrics.recordExecutionSuccess('yield-optimiser', 400);
    metrics.recordExecutionAttempt('dca');
    metrics.recordExecutionFailure('dca');
    metrics.setPendingTransactionCount(3);

    const snapshot = metrics.snapshot();

    expect(snapshot.executions.attempted).toBe(2);
    expect(snapshot.executions.succeeded).toBe(1);
    expect(snapshot.executions.failed).toBe(1);
    expect(snapshot.executions.averageConfirmationLatencyMs).toBe(400);
    expect(snapshot.executions.pending).toBe(3);
    expect(snapshot.executions.perStrategy['yield-optimiser']).toBe(1);
    expect(snapshot.executions.perStrategy.dca).toBe(1);
  });

  it('renders Prometheus metrics text', () => {
    const metrics = new InMemoryMetricsRecorder();

    metrics.recordExecutionAttempt('rebalance');
    metrics.recordExecutionSuccess('rebalance', 150);

    const output = metrics.renderPrometheus();

    expect(output).toContain('vmind_agent_executions_attempted_total 1');
    expect(output).toContain('vmind_agent_executions_succeeded_total 1');
    expect(output).toContain('vmind_agent_strategy_executions_total{strategy="rebalance"} 1');
  });
});
