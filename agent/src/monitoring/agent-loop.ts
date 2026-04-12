import type { BlockEvent, PollingBlockSubscription } from '../blockchain';
import type { PendingTransactionStore } from '../execution';
import type { ExecutionPipeline, ExecutionPipelineRequest } from '../execution';
import type { EvaluationOrchestrator, ReadyVaultExecution, VaultEvaluationOutcome } from '../strategies';
import type { AppLogger } from '../utils/logger';
import type { AgentAlerting } from './alerting';
import type { InMemoryMetricsRecorder } from './metrics';
import type { AgentRuntimeState } from './runtime-state';
import { BlockExecutionScheduler, runWithConcurrency } from './scheduler';

export interface AgentLoop {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface BlockDrivenAgentLoopOptions {
  blockSubscription: PollingBlockSubscription;
  evaluationOrchestrator: EvaluationOrchestrator;
  executionPipeline: ExecutionPipeline;
  scheduler: BlockExecutionScheduler;
  pendingTransactionStore: PendingTransactionStore;
  alerting: AgentAlerting;
  runtimeState: AgentRuntimeState;
  metrics: InMemoryMetricsRecorder;
  buildExecutionRequest: (readyVault: ReadyVaultExecution, blockHeight: number) => ExecutionPipelineRequest;
  logger: AppLogger;
  staleBlockCheckIntervalMs: number;
}

export class BlockDrivenAgentLoop implements AgentLoop {
  private running = false;
  private disposeBlockListener: (() => void) | undefined;
  private processingPromise: Promise<void> = Promise.resolve();
  private queue: BlockEvent[] = [];
  private staleBlockTimer: NodeJS.Timeout | undefined;
  private processingQueuedEvents = false;

  constructor(private readonly options: BlockDrivenAgentLoopOptions) {}

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.options.runtimeState.setStatus('running');

    this.disposeBlockListener = this.options.blockSubscription.onBlock((event) => {
      this.queue.push(event);
      this.processQueuedBlockEvents();
    });

    this.options.blockSubscription.start();
    this.staleBlockTimer = setInterval(() => {
      this.options.alerting.checkStaleBlock();
    }, this.options.staleBlockCheckIntervalMs);
  }

  async stop(): Promise<void> {
    this.running = false;

    this.options.blockSubscription.stop();
    this.disposeBlockListener?.();
    this.disposeBlockListener = undefined;

    if (this.staleBlockTimer) {
      clearInterval(this.staleBlockTimer);
      this.staleBlockTimer = undefined;
    }

    await this.processingPromise;
    this.options.runtimeState.setStatus('stopped');
  }

  private processQueuedBlockEvents(): void {
    if (this.processingQueuedEvents || !this.running) {
      return;
    }

    this.processingQueuedEvents = true;
    this.processingPromise = this.consumeQueue()
      .catch((error) => {
        this.options.runtimeState.setStatus('degraded');
        this.options.logger.error({ err: error }, 'Unhandled error while consuming queued block events');
      })
      .finally(() => {
        this.processingQueuedEvents = false;
      });
  }

  private async consumeQueue(): Promise<void> {
    while (this.running && this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) {
        continue;
      }

      try {
        await this.handleBlockEvent(event);
      } catch (error) {
        this.options.metrics.increment('agent_loop_errors_total', 1);
        this.options.runtimeState.setStatus('degraded');
        this.options.logger.error(
          {
            err: error,
            blockHeight: event.currentHeight,
            previousHeight: event.previousHeight,
            blockHash: event.blockHash,
          },
          'Block processing iteration failed; loop will continue'
        );
      }
    }
  }

  private async handleBlockEvent(event: BlockEvent): Promise<void> {
    this.options.scheduler.resetForBlock(event.currentHeight);
    this.options.runtimeState.setExecutionsInCurrentBlock(0);
    this.options.metrics.gauge('current_block_height', event.currentHeight);

    this.options.alerting.recordProcessedBlock(event.observedAt.getTime());

    const pendingBefore = this.options.pendingTransactionStore.listPending();
    this.options.metrics.setPendingTransactionCount(pendingBefore.length);
    this.options.runtimeState.setPendingTransactions(pendingBefore.length);
    this.options.alerting.checkPendingTransactions(pendingBefore, event.currentHeight);

    const outcomes = await this.options.evaluationOrchestrator.evaluateVaultOutcomes();
    this.options.runtimeState.setVaultsMonitored(outcomes.length);

    for (const outcome of outcomes) {
      this.logOutcome(event, outcome);
    }

    const readyVaults: ReadyVaultExecution[] = outcomes
      .filter((outcome) => outcome.readyForExecution)
      .map((outcome) => ({
        vaultId: outcome.vaultId,
        strategyId: outcome.strategyId,
        strategyType: outcome.strategyType,
        evaluation: outcome.evaluation,
      }));

    const schedulePlan = this.options.scheduler.plan(event.currentHeight, readyVaults);
    this.options.logger.info(
      {
        blockHeight: event.currentHeight,
        readyCount: readyVaults.length,
        selectedCount: schedulePlan.selected.length,
        deferredCount: schedulePlan.deferred.length,
        executionsAlreadyInBlock: schedulePlan.executionsInBlock,
        remainingCapacity: schedulePlan.remainingCapacity,
      },
      'Computed per-block execution schedule'
    );

    if (schedulePlan.deferred.length > 0) {
      this.options.logger.warn(
        {
          blockHeight: event.currentHeight,
          deferredCount: schedulePlan.deferred.length,
          maxExecutionsPerBlock: schedulePlan.remainingCapacity + schedulePlan.executionsInBlock,
        },
        'Deferring ready vault executions due to per-block throttle'
      );
    }

    await runWithConcurrency(
      schedulePlan.selected,
      this.options.scheduler.getMaxConcurrentExecutions(),
      async (readyVault) => {
        await this.executeReadyVault(event.currentHeight, readyVault);
      }
    );

    const pendingAfter = this.options.pendingTransactionStore.listPending();
    this.options.metrics.setPendingTransactionCount(pendingAfter.length);
    this.options.runtimeState.setPendingTransactions(pendingAfter.length);
    this.options.alerting.checkPendingTransactions(pendingAfter, event.currentHeight);

    this.options.runtimeState.markBlockProcessed(event.currentHeight, event.observedAt);
    this.options.runtimeState.setStatus('running');
    this.options.metrics.gauge('last_processed_block_height', event.currentHeight);
  }

  private async executeReadyVault(blockHeight: number, readyVault: ReadyVaultExecution): Promise<void> {
    const vaultId = readyVault.vaultId.toString();

    this.options.scheduler.markExecutionAttempt(blockHeight);
    this.options.runtimeState.setExecutionsInCurrentBlock(
      this.options.scheduler.getExecutionsInCurrentBlock(blockHeight)
    );

    this.options.metrics.recordExecutionAttempt(readyVault.strategyType);

    const startedAt = Date.now();

    try {
      const request = this.options.buildExecutionRequest(readyVault, blockHeight);
      const result = await this.options.executionPipeline.execute(request, readyVault.evaluation);

      this.options.metrics.recordExecutionSuccess(readyVault.strategyType, Date.now() - startedAt);
      this.options.alerting.recordExecutionSuccess(vaultId);

      this.options.logger.info(
        {
          blockHeight,
          vaultId,
          strategyId: readyVault.strategyId.toString(),
          strategyType: readyVault.strategyType,
          txId: result.txId,
          attempts: result.attempts,
          confirmations: result.confirmations,
        },
        'Vault execution succeeded'
      );
    } catch (error) {
      this.options.metrics.recordExecutionFailure(readyVault.strategyType);
      this.options.alerting.recordExecutionFailure(vaultId);
      this.options.logger.error(
        {
          err: error,
          blockHeight,
          vaultId,
          strategyId: readyVault.strategyId.toString(),
          strategyType: readyVault.strategyType,
        },
        'Vault execution failed'
      );
    }
  }

  private logOutcome(event: BlockEvent, outcome: VaultEvaluationOutcome): void {
    this.options.logger.info(
      {
        blockHeight: event.currentHeight,
        vaultId: outcome.vaultId.toString(),
        strategyId: outcome.strategyId.toString(),
        strategyType: outcome.strategyType,
        decision: outcome.evaluation.decision,
        readyForExecution: outcome.readyForExecution,
        reason: outcome.evaluation.reason,
        errors: outcome.evaluation.errors,
      },
      'Vault evaluation outcome'
    );
  }
}

export const PollingAgentLoop = BlockDrivenAgentLoop;