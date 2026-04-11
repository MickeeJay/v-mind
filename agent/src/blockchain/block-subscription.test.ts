import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestLogger } from '../utils/test-logger';
import { PollingBlockSubscription } from './block-subscription';
import type { StacksClient } from './stacks-client';

describe('PollingBlockSubscription', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emits typed block events when block height increases', async () => {
    vi.useFakeTimers();

    const client = {
      getChainTip: vi
        .fn()
        .mockResolvedValueOnce({ blockHeight: 100, blockHash: '0xaaa' })
        .mockResolvedValueOnce({ blockHeight: 101, blockHash: '0xbbb' }),
    } as unknown as StacksClient;

    const logger = new TestLogger();
    const subscription = new PollingBlockSubscription(client, { pollIntervalMs: 1000 }, logger);
    const events: Array<{ previousHeight: number; currentHeight: number; blockHash?: string }> = [];

    subscription.onBlock((event) => {
      events.push(event);
    });

    subscription.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(events).toHaveLength(1);
    expect(events[0].previousHeight).toBe(100);
    expect(events[0].currentHeight).toBe(101);
    expect(events[0].blockHash).toBe('0xbbb');

    subscription.stop();
  });

  it('keeps polling after transient client errors', async () => {
    vi.useFakeTimers();

    const client = {
      getChainTip: vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary outage'))
        .mockResolvedValueOnce({ blockHeight: 220, blockHash: '0xccc' })
        .mockResolvedValueOnce({ blockHeight: 221, blockHash: '0xddd' }),
    } as unknown as StacksClient;

    const logger = new TestLogger();
    const subscription = new PollingBlockSubscription(client, { pollIntervalMs: 1000 }, logger);
    const events: Array<{ currentHeight: number }> = [];

    subscription.onBlock((event) => {
      events.push({ currentHeight: event.currentHeight });
    });

    subscription.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(events).toHaveLength(1);
    expect(events[0].currentHeight).toBe(221);

    subscription.stop();
  });
});
