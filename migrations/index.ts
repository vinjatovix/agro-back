import { database, config, up as migrationUp } from 'migrate-mongo';
import { buildLogger } from '../src/Contexts/shared/plugins/logger.plugin.js';
import { MongoConfigFactory } from '../src/shared/infrastructure/persistence/mongo/MongoConfigFactory.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

interface MigrationsConfig {
  mongodb: {
    url: string;
  };
  migrationsDir: string;
  changelogCollectionName: string;
}

interface MigrationsExport {
  up: () => Promise<void>;
}

const logger = buildLogger('Migrations');

const migrationsConfig: MigrationsConfig = {
  mongodb: {
    url: MongoConfigFactory.createMongoUri()
  },
  migrationsDir: `migrations/${version}`,
  changelogCollectionName: 'changelog'
};

config.set(migrationsConfig);

logger.info(`Migrations version: ${version}`);

const up = async (): Promise<void> => {
  const { db, client } = await database.connect();
  try {
    const migrated: string[] = await migrationUp(db, client);
    migrated.forEach((fileName: string) =>
      logger.info(`Migrated: ${fileName}`)
    );
  } catch (error) {
    logger.error((error as Error).message);
  } finally {
    await client.close();
  }
};

const migrations: MigrationsExport = { up };
export default migrations;
