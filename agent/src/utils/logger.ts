import { randomUUID } from 'node:crypto';
import pino from 'pino';

export type LogContext = Record<string, unknown>;

export type AppLogger = Pick<
  pino.Logger,
  'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'child'
>;

export interface CreateLoggerOptions {
  level: pino.LevelWithSilent;
  serviceName: string;
  nodeEnv: 'development' | 'test' | 'production';
  destination?: pino.DestinationStream;
  baseContext?: LogContext;
}

export function createLogger(options: CreateLoggerOptions): AppLogger {
  const logger = pino(
    {
      level: options.level,
      base: {
        service: options.serviceName,
        env: options.nodeEnv,
        ...(options.baseContext ?? {}),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    options.destination
  );

  return logger;
}

export function withRequestContext(
  logger: AppLogger,
  context: LogContext = {},
  requestId: string = randomUUID()
): AppLogger {
  return logger.child({ requestId, ...context });
}