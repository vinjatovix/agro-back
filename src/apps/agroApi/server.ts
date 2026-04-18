import { scopePerRequest } from 'awilix-express';
import cors from 'cors';
import errorHandler from 'errorhandler';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import Router from 'express-promise-router';
import helmet from 'helmet';
import * as http from 'http';
import httpStatus from 'http-status';

import type { AppLogger } from '../../Contexts/shared/plugins/logger.plugin.js';
import { HttpError } from '../../shared/errors/index.js';
import { envs } from './config/plugins/envs.plugin.js';
import { createAppContainer, type AppContainer } from './container.js';
import {
  createRequestLoggerMiddleware,
  globalLimiter
} from './middlewares/index.js';
import { registerRoutes } from './routes/registerRoutes.js';

const allowedOrigins = envs.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true
};

export class Server {
  private express: express.Express;
  private container: AppContainer;
  private port: string;
  private host: string;
  private httpServer?: http.Server;
  private logger: AppLogger;

  constructor(host: string, port: string, logger: AppLogger) {
    this.port = port;
    this.host = host;
    this.express = express();
    this.express.set('trust proxy', true);
    this.container = createAppContainer();
    this.logger = logger;

    this.express.use(cors(corsOptions));
    this.express.use(globalLimiter);
    this.express.use(express.json({ limit: envs.JSON_BODY_LIMIT }));
    this.express.use(
      express.urlencoded({ extended: true, limit: envs.URL_ENCODED_BODY_LIMIT })
    );

    this.express.use(helmet.dnsPrefetchControl());
    this.express.use(helmet.xssFilter());
    this.express.use(helmet.noSniff());
    this.express.use(helmet.hidePoweredBy());
    this.express.use(helmet.frameguard({ action: 'deny' }));
    this.express.use(helmet.hsts());
    this.express.use(createRequestLoggerMiddleware(this.logger));

    this.express.use(scopePerRequest(this.container));
  }

  async listen(): Promise<void> {
    const router = Router();
    await registerRoutes(router);
    this.express.use(router);
    if (process.env.NODE_ENV === 'development') {
      this.express.use(errorHandler());
    }
    this.express.use(
      (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
        if (err instanceof HttpError) {
          res.status(err.statusCode).json({ message: err.message });
          this.logger.error(err.message, err);
          return;
        }

        this.logger.error('Unexpected error at error handler', err);
        res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Internal server error' });
      }
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
        const message = `Backend running at ${host} in ${env} mode`;
        this.logger.info(message);
        resolve();
      });
    });
  }

  getHTTPServer(): http.Server | undefined {
    return this.httpServer;
  }

  async stop(): Promise<void> {
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
}
