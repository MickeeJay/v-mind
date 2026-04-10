import type { AppLogger, LogContext } from './logger';

export interface TestLogEntry {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message?: string;
  context: Record<string, unknown>;
}

function normalizeLogArguments(args: unknown[]): { message?: string; context: Record<string, unknown> } {
  if (args.length === 0) {
    return { context: {} };
  }

  const [first, second] = args;
  if (typeof first === 'string') {
    return { message: first, context: {} };
  }

  if (typeof first === 'object' && first !== null) {
    return {
      context: first as Record<string, unknown>,
      message: typeof second === 'string' ? second : undefined,
    };
  }

  return { message: String(first), context: {} };
}

export class TestLogger implements AppLogger {
  constructor(
    private readonly sink: TestLogEntry[] = [],
    private readonly boundContext: Record<string, unknown> = {}
  ) {}

  get entries(): TestLogEntry[] {
    return this.sink;
  }

  trace(...args: unknown[]): void {
    this.record('trace', args);
  }

  debug(...args: unknown[]): void {
    this.record('debug', args);
  }

  info(...args: unknown[]): void {
    this.record('info', args);
  }

  warn(...args: unknown[]): void {
    this.record('warn', args);
  }

  error(...args: unknown[]): void {
    this.record('error', args);
  }

  fatal(...args: unknown[]): void {
    this.record('fatal', args);
  }

  child(bindings: LogContext): AppLogger {
    return new TestLogger(this.sink, { ...this.boundContext, ...bindings });
  }

  private record(level: TestLogEntry['level'], args: unknown[]): void {
    const normalized = normalizeLogArguments(args);
    this.sink.push({
      level,
      message: normalized.message,
      context: {
        ...this.boundContext,
        ...normalized.context,
      },
    });
  }
}