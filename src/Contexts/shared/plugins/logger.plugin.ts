import type { MongoClient } from 'mongodb';
import winston from 'winston';
import 'winston-mongodb';
import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';

export interface AppLogger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string, error?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

const { combine, timestamp, json } = winston.format;

const DIRECTORY = 'logs';
const ERRORS_FILENAME = `${DIRECTORY}/error-logs.log`;
const INFO_FILENAME = `${DIRECTORY}/info-logs.log`;

const serviceName = (service: unknown): string => {
  if (typeof service === 'string') return service;
  if (service) return JSON.stringify(service);
  return 'app';
};

const buildConsoleTransport = (
  silent: boolean
): winston.transports.ConsoleTransportInstance =>
  new winston.transports.Console({
    silent,
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) =>
          `[${info.level}] ${serviceName(info.service)} - ${String(
            info.timestamp
          )} : ${String(info.message)}`
      )
    )
  });

// A File transport opens its file as soon as it is built, so tests never build one.
const buildFileTransports = (): winston.transports.FileTransportInstance[] => [
  new winston.transports.File({
    filename: ERRORS_FILENAME,
    level: 'error'
  }),
  new winston.transports.File({
    filename: INFO_FILENAME
  })
];

const buildTransports = (): winston.transport[] => {
  if (envs.NODE_ENV === 'test') {
    return [buildConsoleTransport(!envs.TEST_LOGS)];
  }

  if (envs.NODE_ENV === 'production') {
    return buildFileTransports();
  }

  return [...buildFileTransports(), buildConsoleTransport(false)];
};

const rootLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: buildTransports()
});

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

    warn: (message: string, error?: unknown) => {
      rootLogger.warn({
        service,
        message,
        error: error instanceof Error ? error.stack : error
      });
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
