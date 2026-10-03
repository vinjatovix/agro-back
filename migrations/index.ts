import { database, config, up as migrationUp } from 'migrate-mongo';
import { buildLogger } from '../src/Contexts/shared/plugins/logger.plugin.js';
import { MongoConfigFactory } from '../src/shared/infrastructure/persistence/mongo/MongoConfigFactory.js';

interface MigrationsConfig {
  mongodb: {
    url: string;
  };
  migrationsDir: string;
  changelogCollectionName: string;
  lockCollectionName: string;
  lockTtl: number;
}

interface MigrationsExport {
  up: () => Promise<void>;
}

// One flat folder for every migration, whatever the application version:
// `migrate-mongo` orders them by their timestamp prefix.
const MIGRATIONS_DIR = 'migrations/scripts';

const CHANGELOG_COLLECTION = 'changelog';

const LOCK_COLLECTION = 'changelog_lock';

// Frozen on purpose: `migrate-mongo` creates the lock's TTL index without
// awaiting it, so a different value later makes that `createIndex` reject and
// crash start-up. Changing it needs a migration (`collMod`).
const LOCK_TTL_SECONDS = 300;

const logger = buildLogger('Migrations');

export const buildMigrationsConfig = (url: string): MigrationsConfig => ({
  mongodb: { url },
  migrationsDir: MIGRATIONS_DIR,
  changelogCollectionName: CHANGELOG_COLLECTION,
  lockCollectionName: LOCK_COLLECTION,
  lockTtl: LOCK_TTL_SECONDS
});

config.set(buildMigrationsConfig(MongoConfigFactory.createMongoUri()));

const up = async (): Promise<void> => {
  const { db, client } = await database.connect();
  try {
    const migrated: string[] = await migrationUp(db, client);
    migrated.forEach((fileName: string) =>
      logger.info(`Migrated: ${fileName}`)
    );
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error), error);
    // A failed migration or a lock in place: abort startup.
    throw error;
  } finally {
    // A failed close must neither hide a migration error nor abort a start-up
    // whose migrations already succeeded.
    await client.close().catch((closeError: unknown) => {
      logger.error('Failed to close the migrations client', closeError);
    });
  }
};

const migrations: MigrationsExport = { up };
export default migrations;
