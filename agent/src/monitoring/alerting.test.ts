import { describe, expect, it } from 'vitest';

import { TestLogger } from '../utils/test-logger';

import { AgentAlerting } from './alerting';

describe('AgentAlerting', () => {
  it('emits stale block alert after threshold', () => {
    const logger = new TestLogger();
    const alerting = new AgentAlerting({
      staleBlockThresholdMs: 1000,
      pendingTxBlockThreshold: 20,
      consecutiveFailureThreshold: 3,
      logger,
    });

    alerting.checkStaleBlock(Date.now() + 1500);

    const alerts = logger.entries.filter((entry) => entry.level === 'warn');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.context.alertType).toBe('stale-block-processing');
  });

  it('emits long pending transaction alert', () => {
    const logger = new TestLogger();
    const alerting = new AgentAlerting({
      staleBlockThresholdMs: 1000,
      pendingTxBlockThreshold: 20,
      consecutiveFailureThreshold: 3,
      logger,
    });

    alerting.checkPendingTransactions(
      [
        {
          txId: '0xabc',
          vaultId: '1',
          strategyId: '2',
          contractPrincipal: 'SP000.contract',
          functionName: 'execute',
          nonce: 1n,
          feeMicroStx: 100n,
          retryAttempt: 1,
          submittedAtBlockHeight: 10,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          state: 'pending',
          confirmations: 0,
        },
      ],
      40
    );

    const alerts = logger.entries.filter((entry) => entry.level === 'warn');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.context.alertType).toBe('long-pending-transaction');
  });

  it('alerts on vault consecutive failures over threshold', () => {
    const logger = new TestLogger();
    const alerting = new AgentAlerting({
      staleBlockThresholdMs: 1000,
      pendingTxBlockThreshold: 20,
      consecutiveFailureThreshold: 3,
      logger,
    });

    alerting.recordExecutionFailure('77');
    alerting.recordExecutionFailure('77');
    alerting.recordExecutionFailure('77');
    alerting.recordExecutionFailure('77');

    const alerts = logger.entries.filter((entry) => entry.level === 'warn');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.context.alertType).toBe('vault-consecutive-execution-failures');
  });
});
