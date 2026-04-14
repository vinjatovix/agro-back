import errorHandler from 'errorhandler';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import Router from 'express-promise-router';
import helmet from 'helmet';
import * as http from 'http';
import httpStatus from 'http-status';
import cors from 'cors';
import { registerRoutes } from './routes/index.js';
import { HttpError } from '../../shared/errors/http-error.js';

const corsOptions: cors.CorsOptions = {
  origin: ['http://localhost:5173'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true
};

export class Server {
  private express: express.Express;
  private port: string;
  private host: string;
  private httpServer?: http.Server;

  constructor(host: string, port: string) {
    this.port = port;
    this.host = host;
    this.express = express();

    this.express.use(cors(corsOptions));
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));

    this.express.use(helmet());

    const router = Router();
    registerRoutes(router);

    this.express.use(router);
    if (process.env.NODE_ENV !== 'production') {
      this.express.use(errorHandler());
    }
    this.express.use(
      (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
        console.error(err);

        if (err instanceof HttpError) {
          res.status(err.statusCode).json({ message: err.message });
          return;
        }

        res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Internal server error' });
      }
    );
  }

  async listen(): Promise<void> {
    return new Promise((resolve) => {
      const env: string = this.express.get('env');

      this.httpServer = this.express.listen(this.port, () => {
        const host = ['local', 'test'].includes(env)
          ? `${this.host}:${this.port}`
          : this.host;
        const message = `Backend running at ${host} in ${env} mode`;
        console.log(message);
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
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
