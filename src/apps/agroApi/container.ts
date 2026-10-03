import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { asClass, asValue, createContainer, InjectionMode } from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import { bedPersistenceMapper } from '../../Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { familyPersistenceMapper } from '../../Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { plantPersistenceMapper } from '../../Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import {
  buildLogger,
  type AppLogger
} from '../../Contexts/shared/plugins/index.js';
import { COMPONENT_ROLES } from './wiring/componentRoles.js';
import type {
  AppContainer,
  ContainerCradle
} from './wiring/ContainerCradle.js';
import { scanComponents } from './wiring/scanComponents.js';

export type { AppContainer, ContainerCradle };

export type ContainerDeps = {
  db: Db;
  client: MongoClient;
  sourceRoot: string;
};

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

export async function createAppContainer(
  deps: ContainerDeps
): Promise<AppContainer> {
  const container = createContainer<ContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });

  // Explicit registrations
  container.register({
    db: asValue(deps.db), // Runtime Mongo database instance connected at start-up
    DBClient: asValue(deps.client), // Runtime Mongo client connection handle
    appVersion: asValue(pkg.version), // Service release version read from package.json
    logger: asValue<AppLogger>(buildLogger('agroApi')), // Contextual root logger instance
    bedPersistenceMapper: asValue(bedPersistenceMapper), // Plain persistence mapper without class state
    familyPersistenceMapper: asValue(familyPersistenceMapper), // Plain persistence mapper without class state
    plantPersistenceMapper: asValue(plantPersistenceMapper) // Plain persistence mapper without class state
  });

  const components = await scanComponents(deps.sourceRoot, COMPONENT_ROLES);

  for (const component of components) {
    container.register({
      [component.registrationName]: asClass(component.class).setLifetime(
        component.lifetime
      )
    });
  }

  return container;
}
