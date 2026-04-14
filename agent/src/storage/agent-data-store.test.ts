import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from './sqlite-database';
import { AgentDataStore } from './agent-data-store';

describe('AgentDataStore execution history', () => {
  const tempDirectories: string[] = [];
  let activeStore: AgentDataStore | undefined;

  afterEach(() => {
    activeStore?.close();
    activeStore = undefined;

    while (tempDirectories.length > 0) {
      const directory = tempDirectories.pop();
      if (directory) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it('records and paginates execution history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vmind-agent-store-'));
    tempDirectories.push(directory);

    const store = new AgentDataStore(new SqliteDatabase({ databasePath: join(directory, 'agent.sqlite') }));
    activeStore = store;

    store.recordExecutionHistory({
      txId: 'tx-1',
      vaultId: '1',
      strategyId: '10',
      strategyType: 'yield-optimiser',
      status: 'confirmed',
      observedBlockHeight: 100,
      submittedBlockHeight: 100,
      attempts: 1,
      confirmations: 2,
      nonce: 5,
      feeMicrostx: 150,
      evaluationReason: 'execute',
      errorMessage: null,
      completedAt: '2026-04-14T12:00:00.000Z',
    });

    store.recordExecutionHistory({
      txId: 'tx-2',
      vaultId: '1',
      strategyId: '10',
      strategyType: 'yield-optimiser',
      status: 'failed',
      observedBlockHeight: 101,
      submittedBlockHeight: 101,
      attempts: 2,
      confirmations: 0,
      nonce: 6,
      feeMicrostx: 160,
      evaluationReason: 'execute',
      errorMessage: 'Broadcast rejected',
      completedAt: '2026-04-14T12:05:00.000Z',
    });

    store.recordExecutionHistory({
      txId: 'tx-3',
      vaultId: '2',
      strategyId: '11',
      strategyType: 'rebalance',
      status: 'confirmed',
      observedBlockHeight: 102,
      submittedBlockHeight: 102,
      attempts: 1,
      confirmations: 1,
      nonce: 7,
      feeMicrostx: 170,
      evaluationReason: 'execute',
      errorMessage: null,
      completedAt: '2026-04-14T12:10:00.000Z',
    });

    const vaultHistory = store.listExecutionHistory({
      vaultId: '1',
      page: 1,
      limit: 1,
      from: '2026-04-14T12:00:00.000Z',
      to: '2026-04-14T12:59:59.999Z',
    });

    expect(vaultHistory.total).toBe(2);
    expect(vaultHistory.items).toHaveLength(1);
    expect(vaultHistory.items[0]?.txId).toBe('tx-2');

    const summary = store.getVaultExecutionSummary('1', 2);

    expect(summary.totalExecutions).toBe(2);
    expect(summary.successfulExecutions).toBe(1);
    expect(summary.failedExecutions).toBe(1);
    expect(summary.recentExecutions).toHaveLength(2);

    const recentSummary = store.getRecentExecutionSummary({
      from: '2026-04-14T12:00:00.000Z',
      limit: 2,
    });

    expect(recentSummary.totalExecutions).toBe(3);
    expect(recentSummary.recentExecutions).toHaveLength(2);
    expect(recentSummary.recentExecutions[0]?.txId).toBe('tx-3');
  });
});