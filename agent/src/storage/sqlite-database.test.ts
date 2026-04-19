import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { SqliteDatabase } from './sqlite-database';

describe('SqliteDatabase', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    while (tempDirectories.length > 0) {
      const directory = tempDirectories.pop();
      if (directory) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it('initializes the persistence schema', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vmind-agent-db-'));
    tempDirectories.push(directory);

    const databasePath = join(directory, 'agent.sqlite');
    const store = new SqliteDatabase({ databasePath });

    const tableNames = store.rawDatabase
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    expect(tableNames.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        'execution_history',
        'portfolio_snapshots',
        'protocol_health_checks',
      ])
    );

    store.close();
  });
});