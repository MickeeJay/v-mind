import { AppLogger } from './logger';

export interface GracefulShutdownOptions {
  logger: AppLogger;
  timeoutMs: number;
  onShutdown: () => Promise<void>;
  exit?: (code: number) => never;
}

export type CleanupSignalHandlers = () => void;

export function registerGracefulShutdown(options: GracefulShutdownOptions): CleanupSignalHandlers {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      options.logger.warn({ signal }, 'Shutdown already in progress; forcing non-zero exit');
      (options.exit ?? process.exit)(1);
      return;
    }

    shuttingDown = true;
    options.logger.info({ signal }, 'Received shutdown signal');

    try {
      await Promise.race([
        options.onShutdown(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Graceful shutdown timed out after ${options.timeoutMs}ms`));
          }, options.timeoutMs);
        }),
      ]);

      options.logger.info('Graceful shutdown completed');
      (options.exit ?? process.exit)(0);
    } catch (error) {
      options.logger.error({ err: error }, 'Graceful shutdown failed');
      (options.exit ?? process.exit)(1);
    }
  };

  const onSignal = (signal: NodeJS.Signals): void => {
    void shutdown(signal);
  };

  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);

  return () => {
    process.off('SIGTERM', onSignal);
    process.off('SIGINT', onSignal);
  };
}