import type { Server } from 'node:http';
import type { MongoClient } from 'mongodb';

import { AgroBackApp } from '../../../../../../src/apps/agroApi/AgroBackApp.js';
import {
  createAppContainer,
  type AppContainer
} from '../../../../../../src/apps/agroApi/container.js';
import type { EncrypterTool } from '../../../../../../src/Contexts/shared/plugins/index.js';
import type { EnvironmentArranger } from '../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../src/shared/infrastructure/persistence/index.js';
import { UserMother } from '../../../../../Contexts/Auth/domain/mothers/UserMother.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';
import { SOURCE_ROOT } from '../../../../../shared/sourceRoot.js';
import {
  FamilySeeder,
  PlantSeeder,
  UserSeeder
} from '../../shared/seeders/index.js';

export type SuiteRole = 'admin' | 'user' | 'anotherUser' | 'collaborator';

/** Resources built once per run and shared, read-only, by every scenario. */
export interface SuiteResources {
  readonly app: AgroBackApp;
  readonly httpServer: Server;
  readonly client: MongoClient;
  readonly container: AppContainer;
  readonly environmentArranger: EnvironmentArranger;
  readonly tokens: Readonly<Record<SuiteRole, string>>;
  readonly ids: Readonly<Record<SuiteRole, string>>;
  readonly seeders: Readonly<{
    plant: ReturnType<typeof PlantSeeder>;
    family: ReturnType<typeof FamilySeeder>;
    user: ReturnType<typeof UserSeeder>;
  }>;
}

const SUITE_USERS: Readonly<
  Record<SuiteRole, { email: string; roles: string[] }>
> = {
  admin: { email: 'admin@tsapi.com', roles: ['admin'] },
  user: { email: 'user@tsapi.com', roles: ['user'] },
  anotherUser: { email: 'anotheruser@tsapi.com', roles: ['user'] },
  collaborator: { email: 'collaborator@tsapi.com', roles: ['collaborator'] }
};

const generateTokens = async (
  encrypter: EncrypterTool,
  ids: Readonly<Record<SuiteRole, string>>
): Promise<Record<SuiteRole, string>> => {
  const tokenFor = async (role: SuiteRole): Promise<string> => {
    const token = await encrypter.generateToken({
      id: ids[role],
      email: SUITE_USERS[role].email,
      username: UserMother.random().username.value,
      roles: SUITE_USERS[role].roles
    });
    if (!token) {
      throw new TypeError(`Could not generate the ${role} start-up token`);
    }

    return token;
  };

  return {
    admin: await tokenFor('admin'),
    user: await tokenFor('user'),
    anotherUser: await tokenFor('anotherUser'),
    collaborator: await tokenFor('collaborator')
  };
};

const buildSuite = async (): Promise<SuiteResources> => {
  const client = await DBClientFactory.createClient(
    'agroApi',
    DBConfigFactory.createConfig()
  );

  const container = await createAppContainer({
    db: client.db(),
    client,
    sourceRoot: SOURCE_ROOT
  });

  const environmentArranger = container.resolve<EnvironmentArranger>(
    'environmentArranger'
  );

  const app = new AgroBackApp({
    host: process.env.HOST || 'http://localhost',
    port: process.env.PORT || '0',
    sourceRoot: SOURCE_ROOT
  });

  await app.start(container.resolve('logger'));

  if (!app.httpServer) {
    throw new TypeError('HTTP server is not available');
  }

  const httpServer = app.httpServer;

  const ids: Record<SuiteRole, string> = {
    admin: random.uuid(),
    user: random.uuid(),
    anotherUser: random.uuid(),
    collaborator: random.uuid()
  };

  const tokens = await generateTokens(
    container.resolve<EncrypterTool>('encrypter'),
    ids
  );

  return {
    app,
    httpServer,
    client,
    container,
    environmentArranger,
    tokens,
    ids,
    seeders: {
      family: FamilySeeder(httpServer, tokens.admin),
      plant: PlantSeeder(httpServer, tokens.admin),
      user: UserSeeder(httpServer)
    }
  };
};

class SuiteHolder {
  #resources: SuiteResources | undefined;

  get(): Readonly<SuiteResources> {
    if (!this.#resources) {
      throw new TypeError('Suite resources not started');
    }

    return this.#resources;
  }

  async start(): Promise<void> {
    if (this.#resources) {
      throw new TypeError('Suite resources already started');
    }

    this.#resources = await buildSuite();
  }

  async stop(): Promise<void> {
    // A failed start leaves nothing to stop; throwing here would hide its error.
    if (!this.#resources) {
      return;
    }

    const { app, client, container } = this.#resources;

    // HTTP first, then the database. `app.stop` already closes the factory's
    // cached client; closing ours again is a no-op that keeps this teardown
    // independent of that cache. The client closes even if the HTTP stop fails.
    try {
      await app.stop(container.resolve('logger'));
    } finally {
      this.#resources = undefined;
      await client.close();
    }
  }
}

const holder = new SuiteHolder();

export const startSuite = (): Promise<void> => holder.start();

export const suite = (): Readonly<SuiteResources> => holder.get();

export const stopSuite = (): Promise<void> => holder.stop();
