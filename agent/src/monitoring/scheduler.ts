export interface BlockExecutionSchedulerOptions {
  maxExecutionsPerBlock: number;
  maxConcurrentExecutions: number;
}

export interface BlockSchedulePlan<T> {
  selected: T[];
  deferred: T[];
  executionsInBlock: number;
  remainingCapacity: number;
}

export class BlockExecutionScheduler {
  private currentBlockHeight: number | undefined;
  private executionsInCurrentBlock = 0;

  constructor(private readonly options: BlockExecutionSchedulerOptions) {
    if (!Number.isInteger(options.maxExecutionsPerBlock) || options.maxExecutionsPerBlock <= 0) {
      throw new Error('maxExecutionsPerBlock must be a positive integer');
    }

    if (!Number.isInteger(options.maxConcurrentExecutions) || options.maxConcurrentExecutions <= 0) {
      throw new Error('maxConcurrentExecutions must be a positive integer');
    }
  }

  resetForBlock(blockHeight: number): void {
    if (this.currentBlockHeight !== blockHeight) {
      this.currentBlockHeight = blockHeight;
      this.executionsInCurrentBlock = 0;
    }
  }

  plan<T>(blockHeight: number, candidates: T[]): BlockSchedulePlan<T> {
    this.resetForBlock(blockHeight);

    const remainingCapacity = Math.max(0, this.options.maxExecutionsPerBlock - this.executionsInCurrentBlock);
    const selected = candidates.slice(0, remainingCapacity);
    const deferred = candidates.slice(remainingCapacity);

    return {
      selected,
      deferred,
      executionsInBlock: this.executionsInCurrentBlock,
      remainingCapacity,
    };
  }

  markExecutionAttempt(blockHeight: number): void {
    this.resetForBlock(blockHeight);
    this.executionsInCurrentBlock += 1;
  }

  getExecutionsInCurrentBlock(blockHeight: number): number {
    this.resetForBlock(blockHeight);
    return this.executionsInCurrentBlock;
  }

  getMaxConcurrentExecutions(): number {
    return this.options.maxConcurrentExecutions;
  }
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error('concurrency must be a positive integer');
  }

  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;

      if (typeof current !== 'undefined') {
        await worker(current);
      }
    }
  });

  await Promise.all(workers);
}
