import winston from 'winston';
import 'winston-mongodb';
import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { MongoClient } from 'mongodb';

export interface AppLogger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: unknown) => void;
}

const { combine, timestamp, json } = winston.format;

const DIRECTORY = 'logs';
const ERRORS_FILENAME = `${DIRECTORY}/error-logs.log`;
const INFO_FILENAME = `${DIRECTORY}/info-logs.log`;

const rootLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: ERRORS_FILENAME,
      level: 'error'
    }),
    new winston.transports.File({
      filename: INFO_FILENAME
    })
  ]
});

if (envs.NODE_ENV !== 'production') {
  rootLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          let service: string;
          if (typeof info.service === 'string') {
            service = info.service;
          } else if (info.service) {
            service = JSON.stringify(info.service);
          } else {
            service = 'app';
          }

          return `[${info.level}] ${service} - ${String(
            info.timestamp
          )} : ${String(info.message)}`;
        })
      )
    })
  );
}

export const attachMongoTransport = (client: MongoClient): void => {
  if (envs.NODE_ENV === 'test') return;

  rootLogger.add(
    new winston.transports.MongoDB({
      db: Promise.resolve(client),
      collection: DIRECTORY,
      format: combine(timestamp(), json())
    })
  );
};

export const detachMongoTransport = (): void => {
  rootLogger.transports.forEach((t) => {
    if (t instanceof winston.transports.MongoDB) {
      rootLogger.remove(t);
    }
  });
};

export const buildLogger = (service: string): AppLogger => {
  return {
    debug: (message: string) => {
      rootLogger.debug({ service, message });
    },

    info: (message: string) => {
      rootLogger.info({ service, message });
    },

    warn: (message: string) => {
      rootLogger.warn({ service, message });
    },

    error: (message: string, error?: unknown) => {
      rootLogger.error({
        service,
        message,
        error: error instanceof Error ? error.stack : error
      });
    }
  };
};
