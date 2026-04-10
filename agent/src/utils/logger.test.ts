import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, withRequestContext } from './logger';
import { TestLogger } from './test-logger';

describe('logger', () => {
  it('writes structured JSON logs with service metadata', async () => {
    const stream = new PassThrough();
    const chunks: string[] = [];

    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk.toString('utf8'));
    });

    const logger = createLogger({
      level: 'info',
      serviceName: 'v-mind-agent',
      nodeEnv: 'test',
      destination: stream,
    });

    logger.info({ component: 'unit-test' }, 'logger is online');
    await new Promise((resolve) => setImmediate(resolve));

    const merged = chunks.join('');
    const lines = merged
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(parsed.level).toBe('info');
    expect(parsed.service).toBe('v-mind-agent');
    expect(parsed.env).toBe('test');
    expect(parsed.component).toBe('unit-test');
    expect(parsed.msg).toBe('logger is online');
  });

  it('injects request context using the test logger implementation', () => {
    const baseLogger = new TestLogger();
    const requestLogger = withRequestContext(baseLogger, { vaultId: 'vault-01' }, 'req-123');

    requestLogger.info('evaluate strategy conditions');

    expect(baseLogger.entries).toHaveLength(1);
    expect(baseLogger.entries[0].context.requestId).toBe('req-123');
    expect(baseLogger.entries[0].context.vaultId).toBe('vault-01');
    expect(baseLogger.entries[0].message).toBe('evaluate strategy conditions');
  });
});