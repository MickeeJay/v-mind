import { randomUUID } from 'node:crypto';

import pinoLib, { stdTimeFunctions } from 'pino';

import type { DestinationStream, LevelWithSilent, Logger as PinoLogger } from 'pino';

export type LogContext = Record<string, unknown>;

export interface AppLogger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
  child(bindings: LogContext): AppLogger;
}

export interface CreateLoggerOptions {
  level: LevelWithSilent;
  serviceName: string;
  nodeEnv: 'development' | 'test' | 'production';
  destination?: DestinationStream;
  baseContext?: LogContext;
}

export function createLogger(options: CreateLoggerOptions): AppLogger {
  const logger = pinoLib(
    {
      level: options.level,
      base: {
        service: options.serviceName,
        env: options.nodeEnv,
        ...(options.baseContext ?? {}),
      },
      timestamp: stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    options.destination
  );

  return wrapPinoLogger(logger);
}

export function withRequestContext(
  logger: AppLogger,
  context: LogContext = {},
  requestId: string = randomUUID()
): AppLogger {
  return logger.child({ requestId, ...context });
}

function wrapPinoLogger(logger: PinoLogger): AppLogger {
  const rawLogger = logger as unknown as {
    trace: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    fatal: (...args: unknown[]) => void;
  };

  return {
    trace: (...args) => rawLogger.trace(...args),
    debug: (...args) => rawLogger.debug(...args),
    info: (...args) => rawLogger.info(...args),
    warn: (...args) => rawLogger.warn(...args),
    error: (...args) => rawLogger.error(...args),
    fatal: (...args) => rawLogger.fatal(...args),
    child: (bindings) => wrapPinoLogger(logger.child(bindings)),
  };
}