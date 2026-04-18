import type { AppLogger } from '../../Contexts/shared/plugins/logger.plugin.js';
import { Server } from './server.js';

export interface AgroBackAppConfig {
  host: string;
  port: string;
}

export class AgroBackApp {
  server?: Server;
  host?: string;

  constructor(private readonly config: AgroBackAppConfig) {}

  async start(logger: AppLogger): Promise<void> {
    const { host, port } = this.config;

    this.server = new Server(host, port, logger);
    await this.server.listen();
    const address = this.server.getHTTPServer()?.address();
    const portNumber =
      typeof address === 'object' && address !== null ? address.port : port;
    this.host = `${host}:${portNumber}`;
    logger.info(`Server running at ${this.host}`);
  }

  async stop(logger: AppLogger): Promise<void> {
    if (this.server) {
      await this.server.stop();
      logger.info('Server stopped');
    }
  }

  get httpServer() {
    return this.server?.getHTTPServer();
  }
}
