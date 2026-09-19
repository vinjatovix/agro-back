import type { MongoClient, Db } from 'mongodb';
import type { AppLogger } from '../../Contexts/shared/plugins/logger.plugin.js';
import {
  attachMongoTransport,
  detachMongoTransport
} from '../../Contexts/shared/plugins/logger.plugin.js';
import { Server } from './server.js';

import {
  DBClientFactory,
  DBConfigFactory
} from '../../shared/infrastructure/persistence/index.js';

export interface AgroBackAppConfig {
  host: string;
  port: string;
}

export class AgroBackApp {
  private client?: MongoClient;
  private db?: Db;
  private server?: Server;
  private host?: string;

  constructor(private readonly config: AgroBackAppConfig) {}

  async start(logger: AppLogger): Promise<void> {
    const { host, port } = this.config;
    this.client = await DBClientFactory.createClient(
      'agroApi',
      DBConfigFactory.createConfig()
    );
    this.db = this.client.db();
    attachMongoTransport(this.client);
    this.server = new Server(host, port, logger, {
      db: this.db,
      client: this.client
    });

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

    detachMongoTransport();

    if (this.client) {
      await this.client.close();
      logger.info('Database connection closed');
    }
  }

  get httpServer() {
    return this.server?.getHTTPServer();
  }
}
