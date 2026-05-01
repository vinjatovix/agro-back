import { AgroBackApp } from './apps/agroApi/AgroBackApp.js';
import { envs } from './apps/agroApi/config/plugins/envs.plugin.js';
import { buildLogger } from './Contexts/shared/plugins/logger.plugin.js';

const logger = buildLogger('agroAPI');
const config = {
  host: envs.HOST,
  port: String(envs.PORT)
};

async function startServer() {
  try {
    await new AgroBackApp(config).start(logger);
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
