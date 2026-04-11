import pRetry, { AbortError } from 'p-retry';
import type { AppLogger } from '../utils/logger';

export interface RetryPolicy {
  attempts: number;
  minTimeoutMs: number;
  maxTimeoutMs: number;
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export function isRetriableNetworkError(error: unknown): boolean {
  if (error instanceof HttpRequestError) {
    return error.statusCode >= 500;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  logger: AppLogger,
  operationName: string
): Promise<T> {
  return pRetry(
    async () => {
      try {
        return await operation();
      } catch (error) {
        if (!isRetriableNetworkError(error)) {
          throw new AbortError(error instanceof Error ? error.message : String(error));
        }

        throw error;
      }
    },
    {
      retries: policy.attempts - 1,
      minTimeout: policy.minTimeoutMs,
      maxTimeout: policy.maxTimeoutMs,
      factor: 2,
      onFailedAttempt: (error) => {
        logger.warn(
          {
            operationName,
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            message: error.message,
          },
          'Blockchain request failed, retrying'
        );
      },
    }
  );
}
