import { randomUUID } from 'node:crypto';

import { type SqliteDatabase } from './sqlite-database';

import type {
  ExecutionHistoryInsert,
  ExecutionHistoryRecord,
  ExecutionHistoryQuery,
  ExecutionSummary,
  PaginatedResult,
} from './types';

interface ExecutionHistoryRow {
  id: number;
  txId: string;
  vaultId: string;
  strategyId: string;
  strategyType: string;
  status: string;
  observedBlockHeight: number;
  submittedBlockHeight: number | null;
  attempts: number;
  confirmations: number;
  nonce: number;
  feeMicrostx: number;
  evaluationReason: string;
  errorMessage: string | null;
  completedAt: string;
}

interface QueryFilters {
  vaultId?: string;
  from?: string;
  to?: string;
}

export class AgentDataStore {
  constructor(private readonly database: SqliteDatabase) {
    this.database.rawDatabase.prepare(`
      INSERT INTO execution_history (
        tx_id,
        vault_id,
        strategy_id,
        strategy_type,
        status,
        observed_block_height,
        submitted_block_height,
        attempts,
        confirmations,
        nonce,
        fee_microstx,
        evaluation_reason,
        error_message,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  recordExecutionHistory(record: ExecutionHistoryInsert): void {
    this.database.rawDatabase.prepare(`
      INSERT INTO execution_history (
        tx_id,
        vault_id,
        strategy_id,
        strategy_type,
        status,
        observed_block_height,
        submitted_block_height,
        attempts,
        confirmations,
        nonce,
        fee_microstx,
        evaluation_reason,
        error_message,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.txId,
      record.vaultId,
      record.strategyId,
      record.strategyType,
      record.status,
      record.observedBlockHeight,
      record.submittedBlockHeight,
      record.attempts,
      record.confirmations,
      record.nonce,
      record.feeMicrostx,
      record.evaluationReason,
      record.errorMessage,
      record.completedAt
    );
  }

  close(): void {
    this.database.close();
  }

  listExecutionHistory(query: ExecutionHistoryQuery): PaginatedResult<ExecutionHistoryRecord> {
    const page = normalizePage(query.page);
    const limit = normalizeLimit(query.limit);
    const { rows, total } = this.queryExecutionHistoryRows(
      {
        vaultId: query.vaultId,
        from: query.from,
        to: query.to,
      },
      page,
      limit
    );

    return {
      items: rows.map(mapExecutionHistoryRow),
      total,
      page,
      limit,
    };
  }

  getVaultExecutionSummary(vaultId: string, recentLimit = 5): ExecutionSummary {
    const summary = this.queryExecutionSummary({ vaultId });
    const recentExecutions = this.queryExecutionHistoryRows({ vaultId }, 1, recentLimit).rows.map(
      mapExecutionHistoryRow
    );

    return {
      totalExecutions: summary.totalExecutions,
      successfulExecutions: summary.successfulExecutions,
      failedExecutions: summary.failedExecutions,
      averageAttempts: summary.averageAttempts ?? 0,
      averageConfirmations: summary.averageConfirmations ?? 0,
      averageFeeMicrostx: summary.averageFeeMicrostx ?? 0,
      lastExecutionAt: summary.lastExecutionAt,
      recentExecutions,
    };
  }

  getRecentExecutionSummary(options: { from?: string; limit?: number } = {}): ExecutionSummary {
    const from = options.from?.trim() || undefined;
    const limit = normalizeLimit(options.limit ?? 10);
    const summary = this.queryExecutionSummary({ from });
    const recentExecutions = this.queryExecutionHistoryRows({ from }, 1, limit).rows.map(mapExecutionHistoryRow);

    return {
      totalExecutions: summary.totalExecutions,
      successfulExecutions: summary.successfulExecutions,
      failedExecutions: summary.failedExecutions,
      averageAttempts: summary.averageAttempts ?? 0,
      averageConfirmations: summary.averageConfirmations ?? 0,
      averageFeeMicrostx: summary.averageFeeMicrostx ?? 0,
      lastExecutionAt: summary.lastExecutionAt,
      recentExecutions,
    };
  }

  private queryExecutionHistoryRows(filters: QueryFilters, page: number, limit: number): {
    rows: ExecutionHistoryRow[];
    total: number;
  } {
    const offset = (normalizePage(page) - 1) * normalizeLimit(limit);
    const where = buildExecutionHistoryWhereClause(filters);

    const countRow = this.database.rawDatabase.prepare(`
      SELECT COUNT(*) AS total
      FROM execution_history
      ${where.clause}
    `).get(...where.params) as { total?: number } | undefined;

    const rows = this.database.rawDatabase.prepare(`
      SELECT
        id,
        tx_id AS txId,
        vault_id AS vaultId,
        strategy_id AS strategyId,
        strategy_type AS strategyType,
        status,
        observed_block_height AS observedBlockHeight,
        submitted_block_height AS submittedBlockHeight,
        attempts,
        confirmations,
        nonce,
        fee_microstx AS feeMicrostx,
        evaluation_reason AS evaluationReason,
        error_message AS errorMessage,
        completed_at AS completedAt
      FROM execution_history
      ${where.clause}
      ORDER BY completed_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...where.params, normalizeLimit(limit), offset) as ExecutionHistoryRow[];

    return {
      rows,
      total: countRow?.total ?? 0,
    };
  }

  private queryExecutionSummary(filters: QueryFilters): ExecutionSummaryRow {
    const where = buildExecutionHistoryWhereClause(filters);
    const summary = this.database.rawDatabase.prepare(`
      SELECT
        COUNT(*) AS totalExecutions,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) AS successfulExecutions,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failedExecutions,
        COALESCE(AVG(attempts), 0) AS averageAttempts,
        COALESCE(AVG(confirmations), 0) AS averageConfirmations,
        COALESCE(AVG(fee_microstx), 0) AS averageFeeMicrostx,
        MAX(completed_at) AS lastExecutionAt
      FROM execution_history
      ${where.clause}
    `).get(...where.params) as ExecutionSummaryRow | undefined;

    return summary ?? {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageAttempts: 0,
      averageConfirmations: 0,
      averageFeeMicrostx: 0,
      lastExecutionAt: null,
    };
  }
}

interface ExecutionSummaryRow {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageAttempts: number | null;
  averageConfirmations: number | null;
  averageFeeMicrostx: number | null;
  lastExecutionAt: string | null;
}

function buildExecutionHistoryWhereClause(filters: QueryFilters): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.vaultId && filters.vaultId !== '*') {
    conditions.push('vault_id = ?');
    params.push(filters.vaultId);
  }

  if (filters.from) {
    conditions.push('completed_at >= ?');
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push('completed_at <= ?');
    params.push(filters.to);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function mapExecutionHistoryRow(row: ExecutionHistoryRow): ExecutionHistoryRecord {
  return {
    id: row.id,
    txId: row.txId,
    vaultId: row.vaultId,
    strategyId: row.strategyId,
    strategyType: row.strategyType,
    status: row.status === 'confirmed' ? 'confirmed' : 'failed',
    observedBlockHeight: row.observedBlockHeight,
    submittedBlockHeight: row.submittedBlockHeight,
    attempts: row.attempts,
    confirmations: row.confirmations,
    nonce: row.nonce,
    feeMicrostx: row.feeMicrostx,
    evaluationReason: row.evaluationReason,
    errorMessage: row.errorMessage,
    completedAt: row.completedAt,
  };
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 10;
  }

  return Math.min(Math.floor(value), 100);
}

export function createExecutionPassId(): string {
  return randomUUID();
}