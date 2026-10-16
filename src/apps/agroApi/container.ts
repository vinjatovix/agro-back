import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  aliasTo,
  asClass,
  asValue,
  createContainer,
  InjectionMode,
  type NameAndRegistrationPair
} from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import { bedPersistenceMapper } from '../../Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { familyPersistenceMapper } from '../../Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { CropSpatialService } from '../../Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { plantInstancePersistenceMapper } from '../../Contexts/Agro/PlantInstances/mappers/plantInstancePersistenceMapper.js';
import { plantPersistenceMapper } from '../../Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { MailerAccountNotifier } from '../../Contexts/Auth/application/notifications/index.js';
import type { Mailer } from '../../Contexts/shared/application/mailer/index.js';
import { InProcessBackgroundTasks } from '../../Contexts/shared/infrastructure/background/index.js';
import { createMailer } from '../../Contexts/shared/infrastructure/mailer/index.js';
import { MongoUnitOfWork } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoUnitOfWork.js';
import {
  buildLogger,
  type AppLogger
} from '../../Contexts/shared/plugins/index.js';
import { envs } from './config/plugins/envs.plugin.js';
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

/** Components registered by hand rather than discovered by `scanComponents`. */
export function buildExplicitRegistrations({
  db,
  client
}: Pick<
  ContainerDeps,
  'db' | 'client'
>): NameAndRegistrationPair<ContainerCradle> {
  const logger = buildLogger('agroApi');

  return {
    db: asValue(db), // Runtime Mongo database instance connected at start-up
    DBClient: asValue(client), // Runtime Mongo client connection handle
    appVersion: asValue(pkg.version), // Service release version read from package.json
    logger: asValue<AppLogger>(logger), // Contextual root logger instance
    bedPersistenceMapper: asValue(bedPersistenceMapper), // Plain persistence mapper without class state
    familyPersistenceMapper: asValue(familyPersistenceMapper), // Plain persistence mapper without class state
    plantPersistenceMapper: asValue(plantPersistenceMapper), // Plain persistence mapper without class state
    plantInstancePersistenceMapper: asValue(plantInstancePersistenceMapper), // Plain persistence mapper without class state
    cropSpatialService: asClass(CropSpatialService).singleton(), // Spatial collision and boundary validator
    unitOfWork: asClass(MongoUnitOfWork).singleton(), // Groups cross-aggregate writes in one Mongo transaction
    familySummaryReader: aliasTo('familyReadRepository'), // Plants' port, served by the family read side
    mailer: asValue<Mailer>(
      createMailer({
        nodeEnv: envs.NODE_ENV,
        settings: {
          fromAddress: envs.MAIL_FROM_ADDRESS,
          fromName: envs.MAIL_FROM_NAME,
          resendApiKey: envs.RESEND_API_KEY,
          sendTimeoutMs: envs.MAIL_SEND_TIMEOUT_MS
        },
        logger,
        appVersion: pkg.version
      })
    ), // One channel picked from NODE_ENV and RESEND_API_KEY; fails start-up on bad settings
    backgroundTasks: asClass(InProcessBackgroundTasks).singleton(), // Work started after the answer (emails); drained on shutdown
    accountNotifier: asClass(MailerAccountNotifier).singleton(), // Spanish account emails, sent in the background
    emailValidationRequired: asValue(envs.NODE_ENV !== 'development'), // Login and refresh need a validated email, except in development
    activationLinkBaseUrl: asValue(envs.FRONTEND_BASE_URL) // Frontend page the activation email links to
  };
}

export async function createAppContainer(
  deps: ContainerDeps
): Promise<AppContainer> {
  const container = createContainer<ContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });

  container.register(buildExplicitRegistrations(deps));

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
