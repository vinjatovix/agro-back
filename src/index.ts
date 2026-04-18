import dotenv from 'dotenv';
import { AgroBackApp } from './apps/backend/AgroBackApp.js';
import { buildLogger } from './Contexts/shared/plugins/loggerPlugin.js';

dotenv.config();

const logger = buildLogger('agroAPI');

async function startServer() {
  try {
    await new AgroBackApp().start(logger);
  } catch (err) {
    logger.error('Error starting the application:', err);
    process.exit(1);
  }
}

void startServer();

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}, ${err.stack}`);
  process.exit(1);
});

process.on(
  'unhandledRejection',
  (reason: unknown, promise: Promise<unknown>) => {
    if (reason instanceof Error) {
      logger.error(
        `Unhandled Rejection: ${reason.name} - ${reason.message}, ${reason.stack} ${JSON.stringify(promise)}`
      );
    } else {
      logger.error(`Unhandled Rejection:  ${JSON.stringify(reason)}`);
    }
    process.exit(1);
  }
);
