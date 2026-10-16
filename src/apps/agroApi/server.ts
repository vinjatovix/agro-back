import * as http from 'node:http';
import { scopePerRequest } from 'awilix-express';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import qs from 'qs';

import migrations from '../../../migrations/index.js';
import type { BackgroundTasks } from '../../Contexts/shared/application/background/index.js';
import type { AppLogger } from '../../Contexts/shared/plugins/logger.plugin.js';
import { envs } from './config/plugins/envs.plugin.js';
import type { AppContainer } from './container.js';
import { errorHandler } from './middlewares/errorHandler.js';
import {
  createRequestLoggerMiddleware,
  globalLimiter
} from './middlewares/index.js';
import { setupSwagger } from './openapi/setupSwagger.js';
import { registerRoutes } from './routes/registerRoutes.js';

const allowedOrigins = envs.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  // `allowedHeaders` stays unset so requested headers (incl. If-Match) are reflected.
  exposedHeaders: ['ETag'],
  credentials: true
};

export class Server {
  private readonly express: express.Express;
  private readonly container: AppContainer;
  private readonly port: string;
  private readonly host: string;
  private httpServer?: http.Server;
  private readonly logger: AppLogger;

  constructor(
    host: string,
    port: string,
    logger: AppLogger,
    container: AppContainer
  ) {
    this.port = port;
    this.host = host;
    this.express = express();
    this.express.set('trust proxy', false);
    // The version ETag set by controllers is the only entity tag emitted.
    this.express.set('etag', false);
    this.container = container;
    this.logger = logger;

    this.express.use(cors(corsOptions));
    this.express.use(globalLimiter);
    this.express.use(express.json({ limit: envs.JSON_BODY_LIMIT }));
    this.express.use(
      express.urlencoded({ extended: true, limit: envs.URL_ENCODED_BODY_LIMIT })
    );
    this.express.set('query parser', (str: string) =>
      qs.parse(str, {
        allowPrototypes: false,
        depth: 5,
        parameterLimit: 250,
        arrayLimit: 200
      })
    );

    this.express.use(helmet.dnsPrefetchControl());
    this.express.use(helmet.xssFilter());
    this.express.use(helmet.noSniff());
    this.express.use(helmet.hidePoweredBy());
    this.express.use(helmet.frameguard({ action: 'deny' }));
    this.express.use(helmet.hsts());
    this.express.use(createRequestLoggerMiddleware(this.logger));

    this.express.use(scopePerRequest(this.container));

    setupSwagger(this.express);
  }

  async listen(): Promise<void> {
    await migrations.up();
    const router = Router();
    await registerRoutes(router);
    this.express.use(router);
    this.express.use(
      errorHandler({
        logger: this.logger
      })
    );

    return new Promise((resolve) => {
      const env: string = this.express.get('env') as string;

      this.httpServer = this.express.listen(this.port, () => {
        this.httpServer!.requestTimeout = envs.REQUEST_TIMEOUT_MS;
        this.httpServer!.headersTimeout = envs.HEADERS_TIMEOUT_MS;
        this.httpServer!.keepAliveTimeout = envs.KEEP_ALIVE_TIMEOUT_MS;

        const boundAddress = this.httpServer!.address();
        const resolvedPort =
          typeof boundAddress === 'object' &&
          boundAddress !== null &&
          'port' in boundAddress
            ? String(boundAddress.port)
            : this.port;

        const host = ['local', 'development', 'test'].includes(env)
          ? `${this.host}:${resolvedPort}`
          : this.host;
        this.logger.info(`Backend running at ${host} in ${env} mode`);
        this.logger.info(`Swagger available at ${host}/docs`);
        resolve();
      });
    });
  }

  getHTTPServer(): http.Server | undefined {
    return this.httpServer;
  }

  async stop(): Promise<void> {
    await this.closeHttpServer();
    await this.drainBackgroundTasks();
  }

  private closeHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.httpServer.close((error) => {
        if (error) {
          this.logger.error('Error stopping server', error);
          reject(error);
          return;
        }

        this.logger.info('Server stopped');
        resolve();
      });
    });
  }

  /**
   * Waits for work started after an answer (emails) for at most
   * `MAIL_SEND_TIMEOUT_MS`, so a clean shutdown does not drop it.
   */
  private async drainBackgroundTasks(): Promise<void> {
    const backgroundTasks =
      this.container.resolve<BackgroundTasks>('backgroundTasks');
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), envs.MAIL_SEND_TIMEOUT_MS);
    });

    try {
      const outcome = await Promise.race([
        backgroundTasks.idle().then(() => 'idle' as const),
        timeout
      ]);

      if (outcome === 'timeout') {
        this.logger.warn('Stopped before every background task settled');
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
