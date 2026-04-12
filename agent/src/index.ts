import 'dotenv/config';
import { contractPrincipalCV, uintCV } from '@stacks/transactions';
import {
  PollingBlockSubscription,
  StacksApiBlockchainClient,
  createStacksNetwork,
  parseContractIdentifier,
} from './blockchain';
import { config } from './config';
import {
  ConfirmationPoller,
  ExecutionPipeline,
  FeeEstimator,
  HttpTransactionNodeClient,
  InMemoryPendingTransactionStore,
  NonceManager,
  TransactionBroadcaster,
  TransactionBuilder,
  TransactionSigner,
} from './execution';
import {
  AgentAlerting,
  AgentRuntimeState,
  BlockDrivenAgentLoop,
  BlockExecutionScheduler,
  InMemoryMetricsRecorder,
  MonitoringHttpServer,
} from './monitoring';
import {
  EvaluationOrchestrator,
  OnChainStrategyConfigurationRepository,
  StaticMarketContextProvider,
  type ReadyVaultExecution,
} from './strategies';
import { createLogger, registerGracefulShutdown, withRequestContext } from './utils';
import { StacksVaultRegistry } from './vaults';

async function main(): Promise<void> {
  const logger = createLogger({
    level: config.logLevel,
    serviceName: config.serviceName,
    nodeEnv: config.nodeEnv,
  });

  const startupLogger = withRequestContext(logger, { component: 'startup' });

  const runtimeState = new AgentRuntimeState();
  runtimeState.setStatus('starting');

  const metrics = new InMemoryMetricsRecorder();
  const scheduler = new BlockExecutionScheduler({
    maxExecutionsPerBlock: config.scheduling.maxExecutionsPerBlock,
    maxConcurrentExecutions: config.scheduling.maxConcurrentExecutions,
  });

  const blockchainClient = new StacksApiBlockchainClient(config, startupLogger);
  const network = createStacksNetwork(config.stacks.network, config.stacks.apiBaseUrl);
  const pendingTransactionStore = new InMemoryPendingTransactionStore();
  const nodeClient = new HttpTransactionNodeClient(config, network, logger);

  const transactionBuilder = new TransactionBuilder(network, logger, config.stacks.privateKey);
  const feeEstimator = new FeeEstimator({
    nodeClient,
    feeMultiplier: config.execution.feeMultiplier,
    minFeeMicroStx: config.execution.minFeeMicroStx,
    logger,
  });
  const nonceManager = new NonceManager(nodeClient, logger);
  const transactionSigner = new TransactionSigner(network, logger, config.stacks.privateKey);
  const transactionBroadcaster = new TransactionBroadcaster(nodeClient, pendingTransactionStore, logger);
  const confirmationPoller = new ConfirmationPoller(
    nodeClient,
    pendingTransactionStore,
    {
      requiredConfirmations: config.execution.requiredConfirmations,
      pollIntervalMs: config.execution.confirmationPollIntervalMs,
      maxPollAttempts: config.execution.maxConfirmationPolls,
    },
    logger
  );

  const executionPipeline = new ExecutionPipeline({
    transactionBuilder,
    feeEstimator,
    nonceManager,
    transactionSigner,
    transactionBroadcaster,
    confirmationPoller,
    logger,
  });

  const evaluationOrchestrator = new EvaluationOrchestrator({
    vaultRegistry: new StacksVaultRegistry({
      client: blockchainClient,
      vaultCoreContractPrincipal: config.contracts.vaultCoreContractPrincipal,
      logger,
    }),
    strategyRepository: new OnChainStrategyConfigurationRepository({
      client: blockchainClient,
      strategyRegistryContractPrincipal: config.contracts.strategyRegistryContractPrincipal,
      logger,
    }),
    marketContextProvider: new StaticMarketContextProvider(),
  });

  const alerting = new AgentAlerting({
    staleBlockThresholdMs: config.monitoring.staleBlockThresholdMs,
    pendingTxBlockThreshold: config.monitoring.pendingTxBlockThreshold,
    consecutiveFailureThreshold: config.monitoring.consecutiveFailureThreshold,
    logger,
  });

  const monitoringServer = new MonitoringHttpServer({
    healthHost: config.monitoring.healthcheckHost,
    healthPort: config.monitoring.healthcheckPort,
    metricsHost: config.monitoring.metricsHost,
    metricsPort: config.monitoring.metricsPort,
    runtimeState,
    metrics,
    logger,
  });

  const blockSubscription = new PollingBlockSubscription(
    blockchainClient,
    { pollIntervalMs: config.loop.pollIntervalMs },
    logger
  );

  const agentLoop = new BlockDrivenAgentLoop({
    blockSubscription,
    evaluationOrchestrator,
    executionPipeline,
    scheduler,
    pendingTransactionStore,
    alerting,
    runtimeState,
    metrics,
    logger,
    staleBlockCheckIntervalMs: config.loop.pollIntervalMs,
    buildExecutionRequest: (readyVault, blockHeight) => {
      return buildExecutionRequest(readyVault, blockHeight);
    },
  });

  registerGracefulShutdown({
    logger,
    timeoutMs: config.shutdown.timeoutMs,
    onShutdown: async () => {
      runtimeState.setStatus('stopped');

      logger.info('Stopping observability servers before shutdown');
      await monitoringServer.stop();

      logger.info('Stopping agent loop before shutdown');
      await agentLoop.stop();
    },
  });

  logger.info(
    {
      network: config.stacks.network,
      apiBaseUrl: config.stacks.apiBaseUrl,
      pollIntervalMs: config.loop.pollIntervalMs,
      maxExecutionsPerBlock: config.scheduling.maxExecutionsPerBlock,
      maxConcurrentExecutions: config.scheduling.maxConcurrentExecutions,
      healthPort: config.monitoring.healthcheckPort,
      metricsPort: config.monitoring.metricsPort,
    },
    'Starting V-Mind autonomous agent service'
  );

  await monitoringServer.start();
  await agentLoop.start();
}

function buildExecutionRequest(readyVault: ReadyVaultExecution, blockHeight: number) {
  const functionArgs = config.execution.functionName === 'execute'
    || config.execution.functionName === 'execute-strategy'
    ? [
        uintCV(readyVault.vaultId),
        uintCV(readyVault.strategyId),
        uintCV(BigInt(config.execution.defaultProtocolId)),
        uintCV(config.execution.defaultAssetAmount),
        toContractPrincipalCV(config.contracts.traitZestContractPrincipal),
        toContractPrincipalCV(config.contracts.traitAlexContractPrincipal),
        toContractPrincipalCV(config.contracts.traitStackingDaoContractPrincipal),
        toContractPrincipalCV(config.contracts.traitHermeticaContractPrincipal),
      ]
    : [uintCV(readyVault.vaultId), uintCV(readyVault.strategyId)];

  return {
    vaultId: readyVault.vaultId.toString(),
    strategyId: readyVault.strategyId.toString(),
    senderAddress: config.execution.senderAddress,
    contractPrincipal: config.execution.contractPrincipal,
    functionName: config.execution.functionName,
    functionArgs,
    evaluationReason: readyVault.evaluation.reason,
    observedBlockHeight: blockHeight,
    maxRetries: config.execution.maxRetries,
    senderKey: config.stacks.privateKey,
  };
}

function toContractPrincipalCV(contractPrincipal: string) {
  const reference = parseContractIdentifier(contractPrincipal);
  return contractPrincipalCV(reference.address, reference.name);
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
