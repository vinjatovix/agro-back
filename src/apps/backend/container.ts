import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode
} from 'awilix';
import type { AwilixContainer } from 'awilix';
import { HealthService } from '../../Contexts/backend/health/application/health.service.js';
import pkg from '../../../package.json';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../shared/infrastructure/persistence/index.js';

export type AppContainer = AwilixContainer;

export const createAppContainer = (): AppContainer => {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
  });

  container.register({
    appVersion: asValue(pkg.version),
    DBConfig: asFunction(() => DBConfigFactory.createConfig()).singleton(),
    DBClient: asFunction(({ DBConfig }) =>
      DBClientFactory.createClient('backend', DBConfig)
    ).singleton(),
    healthService: asClass(HealthService).scoped()
  });

  return container;
};
