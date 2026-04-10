import type { BlockchainClient } from '../blockchain';
import type { MetricsRecorder } from './metrics';
import { delay } from '../utils/async';
import type { AppLogger } from '../utils/logger';

export interface AgentLoop {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PollingAgentLoopOptions {
  blockchainClient: BlockchainClient;
  metrics: MetricsRecorder;
  logger: AppLogger;
  pollIntervalMs: number;
  logEveryNBlocks: number;
}

export class PollingAgentLoop implements AgentLoop {
  private running = false;
  private loopPromise?: Promise<void>;
  private nextStatusLogBlock = 0;

  constructor(private readonly options: PollingAgentLoopOptions) {}

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.loopPromise = this.run();
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loopPromise;
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        const tip = await this.options.blockchainClient.getChainTip();
        this.options.metrics.gauge('chain_tip_height', tip.blockHeight);

        if (tip.blockHeight >= this.nextStatusLogBlock) {
          this.options.logger.info(
            {
              blockHeight: tip.blockHeight,
              blockHash: tip.blockHash,
            },
            'Agent loop heartbeat'
          );
          this.nextStatusLogBlock = tip.blockHeight + this.options.logEveryNBlocks;
        }
      } catch (error) {
        this.options.metrics.increment('agent_loop_errors_total', 1);
        this.options.logger.error({ err: error }, 'Agent loop iteration failed');
      }

      await delay(this.options.pollIntervalMs);
    }
  }
}