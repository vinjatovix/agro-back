import winston from 'winston';
import 'winston-mongodb';
import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';
import { MongoClientFactory } from '../../../shared/infrastructure/persistence/mongo/MongoClientFactory.js';
import { MongoConfigFactory } from '../../../shared/infrastructure/persistence/mongo/MongoConfigFactory.js';

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

const logger = winston.createLogger({
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

if (envs.NODE_ENV !== 'test') {
  const setupMongoLogger = async (logger: winston.Logger) => {
    const mongoClient = await MongoClientFactory.createClient(
      DIRECTORY,
      MongoConfigFactory.createConfig()
    );

    const transportOptions = {
      db: Promise.resolve(mongoClient),
      collection: DIRECTORY,
      format: combine(timestamp(), json())
    };

    try {
      logger.add(new winston.transports.MongoDB(transportOptions));
    } catch (error) {
      logger.error('Error setting up logger:', error);
    }
  };

  setupMongoLogger(logger).catch((error) => {
    logger.error('Error initializing MongoDB logger:', error);
  });
}

if (envs.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          let service: string;
          if (typeof info.service === 'string') {
            service = info.service;
          } else if (info.service !== undefined) {
            service = JSON.stringify(info.service);
          } else {
            service = 'app';
          }

          return `[${info.level}] ${service} - ${String(info.timestamp)} : ${String(
            info.message
          )}`;
        })
      )
    })
  );
}

export const buildLogger = (service: string): AppLogger => {
  return {
    debug: (message: string) => {
      logger.debug({ service, message });
    },
    info: (message: string) => {
      logger.info({ service, message });
    },
    warn: (message: string) => {
      logger.warn({ service, message });
    },
    error: (message: string, error?: unknown) => {
      logger.error({
        service,
        message,
        error: error instanceof Error ? error.stack : error
      });
    }
  };
};
