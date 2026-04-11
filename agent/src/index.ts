import 'dotenv/config';
import { PollingBlockSubscription, StacksApiBlockchainClient } from './blockchain';
import { config } from './config';
import { InFlightSubmissionTracker } from './execution';
import { InMemoryMetricsRecorder, PollingAgentLoop } from './monitoring';
import { createLogger, registerGracefulShutdown, withRequestContext } from './utils';

async function main(): Promise<void> {
  const logger = createLogger({
    level: config.logLevel,
    serviceName: config.serviceName,
    nodeEnv: config.nodeEnv,
  });

  const startupLogger = withRequestContext(logger, { component: 'startup' });
  const submissionTracker = new InFlightSubmissionTracker();
  const metrics = new InMemoryMetricsRecorder();
  const blockchainClient = new StacksApiBlockchainClient(config, startupLogger);
  const blockSubscription = new PollingBlockSubscription(
    blockchainClient,
    { pollIntervalMs: config.loop.pollIntervalMs },
    logger
  );

  const disposeBlockListener = blockSubscription.onBlock((event) => {
    logger.info(
      {
        previousHeight: event.previousHeight,
        currentHeight: event.currentHeight,
        blockHash: event.blockHash,
      },
      'Observed new Stacks block'
    );
  });

  const agentLoop = new PollingAgentLoop({
    blockchainClient,
    metrics,
    logger,
    pollIntervalMs: config.loop.pollIntervalMs,
    logEveryNBlocks: config.loop.logEveryNBlocks,
  });

  registerGracefulShutdown({
    logger,
    timeoutMs: config.shutdown.timeoutMs,
    onShutdown: async () => {
      blockSubscription.stop();
      disposeBlockListener();

      logger.info('Stopping agent loop before shutdown');
      await agentLoop.stop();

      logger.info('Waiting for in-flight transaction submissions to settle');
      await submissionTracker.drain();
    },
  });

  logger.info(
    {
      network: config.stacks.network,
      apiBaseUrl: config.stacks.apiBaseUrl,
      pollIntervalMs: config.loop.pollIntervalMs,
      logEveryNBlocks: config.loop.logEveryNBlocks,
    },
    'Starting V-Mind autonomous agent service'
  );

  blockSubscription.start();
  await agentLoop.start();
}

void main().catch((error) => {
  const fallbackLogger = createLogger({
    level: config.logLevel,
    serviceName: config.serviceName,
    nodeEnv: config.nodeEnv,
  });
  fallbackLogger.fatal({ err: error }, 'Agent startup failed');
  process.exit(1);
});
