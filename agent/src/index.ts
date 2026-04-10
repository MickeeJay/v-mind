import 'dotenv/config';
import { StacksApiBlockchainClient } from './blockchain';
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
