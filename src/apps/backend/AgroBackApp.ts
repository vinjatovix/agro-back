import type { AppLogger } from '../../Contexts/shared/plugins/loggerPlugin.js';
import { Server } from './server.js';

export class AgroBackApp {
  server?: Server;
  host?: string;

  async start(logger: AppLogger): Promise<void> {
    const host: string = process.env.HOST || 'http://localhost';
    const port: string = process.env.PORT || '0';

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
