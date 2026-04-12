import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { InMemoryMetricsRecorder } from './metrics';
import type { AgentRuntimeSnapshot, AgentRuntimeState } from './runtime-state';
import type { AppLogger } from '../utils/logger';

export interface MonitoringHttpServerOptions {
  healthHost: string;
  healthPort: number;
  metricsHost: string;
  metricsPort: number;
  runtimeState: AgentRuntimeState;
  metrics: InMemoryMetricsRecorder;
  logger: AppLogger;
}

export class MonitoringHttpServer {
  private healthServer: Server | undefined;
  private metricsServer: Server | undefined;

  constructor(private readonly options: MonitoringHttpServerOptions) {}

  async start(): Promise<void> {
    const sharedServer =
      this.options.metricsHost === this.options.healthHost
      && this.options.metricsPort === this.options.healthPort;

    this.healthServer = createServer((request, response) => {
      if (sharedServer && request.url && request.url.startsWith('/metrics')) {
        this.handleMetricsRequest(request, response);
        return;
      }

      this.handleHealthRequest(request, response);
    });

    await listen(this.healthServer, this.options.healthPort, this.options.healthHost);
    this.options.logger.info(
      {
        host: this.options.healthHost,
        port: this.options.healthPort,
        path: '/health',
      },
      'Health check HTTP server is listening'
    );

    if (sharedServer) {
      return;
    }

    this.metricsServer = createServer((request, response) => {
      this.handleMetricsRequest(request, response);
    });

    await listen(this.metricsServer, this.options.metricsPort, this.options.metricsHost);
    this.options.logger.info(
      {
        host: this.options.metricsHost,
        port: this.options.metricsPort,
        path: '/metrics',
      },
      'Metrics HTTP server is listening'
    );
  }

  async stop(): Promise<void> {
    await Promise.all([
      closeServer(this.healthServer),
      closeServer(this.metricsServer),
    ]);

    this.healthServer = undefined;
    this.metricsServer = undefined;
  }

  private handleHealthRequest(request: IncomingMessage, response: ServerResponse): void {
    if (!request.url || !request.url.startsWith('/health')) {
      response.statusCode = 404;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const snapshot = this.options.runtimeState.snapshot();
    const payload = {
      status: snapshot.status,
      lastProcessedBlockHeight: snapshot.lastProcessedBlockHeight,
      vaultsMonitored: snapshot.vaultsMonitored,
      executionsInCurrentBlock: snapshot.executionsInCurrentBlock,
      pendingTransactions: snapshot.pendingTransactions,
      lastProcessedBlockAt: snapshot.lastProcessedBlockAt,
    };

    response.statusCode = toHealthStatusCode(snapshot);
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
  }

  private handleMetricsRequest(request: IncomingMessage, response: ServerResponse): void {
    if (!request.url || !request.url.startsWith('/metrics')) {
      response.statusCode = 404;
      response.setHeader('content-type', 'text/plain; charset=utf-8');
      response.end('not found\n');
      return;
    }

    response.statusCode = 200;
    response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    response.end(this.options.metrics.renderPrometheus());
  }
}

function toHealthStatusCode(snapshot: AgentRuntimeSnapshot): number {
  if (snapshot.status === 'degraded' || snapshot.status === 'stopped') {
    return 503;
  }

  return 200;
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeServer(server: Server | undefined): Promise<void> {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
