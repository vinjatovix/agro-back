import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer
} from 'awilix';
import { createRequire } from 'module';
import { HealthService } from '../../Contexts/backend/health/application/health.service.js';
import {
  buildLogger,
  type AppLogger
} from '../../Contexts/shared/plugins/loggerPlugin.js';
import {
  DBClientFactory,
  DBConfigFactory,
  DBEnvironmentArranger,
  type DBConfig
} from '../../shared/infrastructure/persistence/index.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json') as { version: string };

export type AppContainer = AwilixContainer;

export const createAppContainer = (): AppContainer => {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
  });

  container.register({
    appVersion: asValue(pkg.version),
    logger: asValue<AppLogger>(buildLogger('backend')),
    DBConfig: asFunction(() => DBConfigFactory.createConfig()).singleton(),
    DBClient: asFunction((DBConfig: DBConfig) =>
      DBClientFactory.createClient('backend', DBConfig)
    ).singleton(),
    healthService: asClass(HealthService).scoped()
  });

  container.register({
    environmentArranger: asClass(DBEnvironmentArranger).singleton()
  });

  return container;
};
