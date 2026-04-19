import { describe, expect, it } from 'vitest';

import { BlockExecutionScheduler, runWithConcurrency } from './scheduler';

describe('BlockExecutionScheduler', () => {
  it('enforces per-block execution limits', () => {
    const scheduler = new BlockExecutionScheduler({
      maxExecutionsPerBlock: 2,
      maxConcurrentExecutions: 2,
    });

    const plan = scheduler.plan(100, ['a', 'b', 'c']);

    expect(plan.selected).toEqual(['a', 'b']);
    expect(plan.deferred).toEqual(['c']);
  });

  it('resets execution count on new block', () => {
    const scheduler = new BlockExecutionScheduler({
      maxExecutionsPerBlock: 1,
      maxConcurrentExecutions: 1,
    });

    scheduler.markExecutionAttempt(100);
    expect(scheduler.getExecutionsInCurrentBlock(100)).toBe(1);

    scheduler.resetForBlock(101);
    expect(scheduler.getExecutionsInCurrentBlock(101)).toBe(0);
  });
});

describe('runWithConcurrency', () => {
  it('executes all tasks with configured concurrency', async () => {
    const values = [1, 2, 3, 4, 5];
    const visited: number[] = [];

    await runWithConcurrency(values, 2, async (value) => {
      visited.push(value);
    });

    expect(visited.sort((left, right) => left - right)).toEqual(values);
  });
});
