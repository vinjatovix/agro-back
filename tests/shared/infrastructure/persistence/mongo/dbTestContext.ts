import {
  asClass,
  type AwilixContainer,
  createContainer,
  InjectionMode,
  type NameAndRegistrationPair
} from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import {
  buildExplicitRegistrations,
  type ContainerCradle
} from '../../../../../src/apps/agroApi/container.js';
import {
  DBClientFactory,
  DBEnvironmentArranger
} from '../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from './testDBConfig.js';

export type DbTestContext = {
  client: MongoClient;
  db: Db;
  container: AwilixContainer<ContainerCradle>;
  /** Empties every collection of the worker's test database. */
  reset(): Promise<void>;
  /** Closes the connection; safe to call more than once. */
  close(): Promise<void>;
};

/**
 * One connection and a minimal container for a `*.db.test.ts` file: the
 * production explicit registrations plus only the `components` the file
 * needs. Create it in `beforeAll`, `reset()` in `beforeEach`, `close()` in
 * `afterAll`.
 */
export async function createDbTestContext(
  components: NameAndRegistrationPair<ContainerCradle> = {}
): Promise<DbTestContext> {
  const client = await DBClientFactory.createClient(
    'agroApi-test',
    createTestDBConfig()
  );
  const db = client.db();

  const container = createContainer<ContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });
  container.register(buildExplicitRegistrations({ db, client }));
  container.register({
    environmentArranger: asClass(DBEnvironmentArranger).singleton()
  });
  container.register(components);

  let closing: Promise<void> | null = null;

  return {
    client,
    db,
    container,
    reset: () => container.resolve('environmentArranger').arrange(),
    close: () => {
      closing ??= client.close();
      return closing;
    }
  };
}
