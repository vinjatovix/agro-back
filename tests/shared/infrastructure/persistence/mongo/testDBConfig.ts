import {
  type DBConfig,
  DBConfigFactory
} from '../../../../../src/shared/infrastructure/persistence/index.js';

/**
 * DB config for a Jest suite: one database per worker (`test-1`, `test-2`…).
 * Every DB suite wipes all collections before each test and Jest runs suites
 * in parallel workers, so workers must not share a database. The test user
 * lives in the base database and may write to `test-1`…`test-16`
 * (`docker/mongo/mongo-init.js`).
 */
export const createTestDBConfig = (): DBConfig => {
  const config = DBConfigFactory.createConfig();
  const db = `${config.db}-${process.env.JEST_WORKER_ID ?? '1'}`;
  const connectionString = new URL(config.connectionString);
  connectionString.pathname = `/${db}`;
  connectionString.searchParams.set('authSource', config.db);

  return { ...config, db, connectionString: connectionString.toString() };
};
