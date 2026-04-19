import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

export interface SqliteDatabaseOptions {
  databasePath: string;
}

export class SqliteDatabase {
  private readonly database: InstanceType<typeof BetterSqlite3>;

  constructor(options: SqliteDatabaseOptions) {
    const resolvedPath = resolve(options.databasePath);
    mkdirSync(dirname(resolvedPath), { recursive: true });

    this.database = new BetterSqlite3(resolvedPath);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');
    this.database.pragma('busy_timeout = 5000');
    this.database.defaultSafeIntegers(false);

    this.initializeSchema();
  }

  get rawDatabase(): InstanceType<typeof BetterSqlite3> {
    return this.database;
  }

  close(): void {
    if (this.database.open) {
      this.database.close();
    }
  }

  private initializeSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_id TEXT NOT NULL UNIQUE,
        vault_id TEXT NOT NULL,
        strategy_id TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        status TEXT NOT NULL,
        observed_block_height INTEGER NOT NULL,
        submitted_block_height INTEGER,
        attempts INTEGER NOT NULL,
        confirmations INTEGER NOT NULL,
        nonce INTEGER NOT NULL,
        fee_microstx INTEGER NOT NULL,
        evaluation_reason TEXT NOT NULL,
        error_message TEXT,
        completed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_execution_history_vault_completed_at
        ON execution_history (vault_id, completed_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_execution_history_completed_at
        ON execution_history (completed_at DESC, id DESC);

      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_address TEXT NOT NULL,
        block_height INTEGER NOT NULL,
        captured_at TEXT NOT NULL,
        total_aum_microstx INTEGER NOT NULL,
        total_yield_microstx INTEGER NOT NULL,
        active_vaults INTEGER NOT NULL,
        vault_count INTEGER NOT NULL,
        UNIQUE(owner_address, block_height)
      );

      CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_owner_captured_at
        ON portfolio_snapshots (owner_address, captured_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_captured_at
        ON portfolio_snapshots (captured_at DESC, id DESC);

      CREATE TABLE IF NOT EXISTS protocol_health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_pass_id TEXT NOT NULL,
        protocol_id TEXT NOT NULL,
        protocol_name TEXT NOT NULL,
        status TEXT NOT NULL,
        healthy INTEGER NOT NULL,
        reason TEXT NOT NULL,
        details_json TEXT NOT NULL,
        block_height INTEGER NOT NULL,
        checked_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_protocol_health_checks_pass_id
        ON protocol_health_checks (check_pass_id, id DESC);

      CREATE INDEX IF NOT EXISTS idx_protocol_health_checks_checked_at
        ON protocol_health_checks (checked_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_protocol_health_checks_protocol_checked_at
        ON protocol_health_checks (protocol_id, checked_at DESC, id DESC);
    `);
  }
}