import type { AppLogger } from '../utils/logger';
import { blockEventSchema, type BlockEvent } from './schemas';
import type { StacksClient } from './stacks-client';

export type BlockListener = (event: BlockEvent) => void;

export interface BlockSubscriptionOptions {
  pollIntervalMs: number;
}

export class PollingBlockSubscription {
  private readonly listeners = new Set<BlockListener>();
  private pollTimer?: NodeJS.Timeout;
  private running = false;
  private lastSeenHeight?: number;

  constructor(
    private readonly client: StacksClient,
    private readonly options: BlockSubscriptionOptions,
    private readonly logger: AppLogger
  ) {}

  onBlock(listener: BlockListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    void this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async poll(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const tip = await this.client.getChainTip();
      if (this.lastSeenHeight !== undefined && tip.blockHeight > this.lastSeenHeight) {
        const event = blockEventSchema.parse({
          previousHeight: this.lastSeenHeight,
          currentHeight: tip.blockHeight,
          blockHash: tip.blockHash,
          observedAt: new Date(),
        });

        for (const listener of this.listeners) {
          listener(event);
        }
      }

      this.lastSeenHeight = tip.blockHeight;
    } catch (error) {
      this.logger.error({ err: error }, 'Block polling iteration failed');
    } finally {
      this.pollTimer = setTimeout(() => {
        void this.poll();
      }, this.options.pollIntervalMs);
    }
  }
}
