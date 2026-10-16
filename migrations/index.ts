import { setTimeout as sleep } from 'node:timers/promises';
import { database, config, up as migrationUp } from 'migrate-mongo';
import type { MongoClient } from 'mongodb';
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

// Upper bound to wait for in-flight operations before closing anyway.
const IDLE_TIMEOUT_MS = 5000;

const logger = buildLogger('Migrations');

type PoolEventSource = Pick<MongoClient, 'on'>;

/**
 * `migrate-mongo` starts a `createIndex` on its lock collection without
 * awaiting it (`lib/utils/lock.js`), the last one when it clears the lock at
 * the end of `up`. Closing the client then interrupts it and its rejection
 * goes unhandled, so the client is closed once no connection is in use.
 */
const trackConnectionsInUse = (
  client: PoolEventSource
): (() => Promise<void>) => {
  let inUse = 0;
  let notifyIdle: (() => void) | undefined;

  const release = (): void => {
    inUse -= 1;
    if (inUse === 0) notifyIdle?.();
  };

  client.on('connectionCheckOutStarted', () => {
    inUse += 1;
  });
  client.on('connectionCheckOutFailed', release);
  client.on('connectionCheckedIn', release);

  return async (): Promise<void> => {
    if (inUse === 0) return;

    const idle = new Promise<void>((resolve) => {
      notifyIdle = resolve;
    });
    const timeout = new AbortController();

    await Promise.race([
      idle,
      sleep(IDLE_TIMEOUT_MS, undefined, { signal: timeout.signal }).catch(
        () => undefined
      )
    ]);
    timeout.abort();
  };
};

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
  const waitUntilIdle = trackConnectionsInUse(client);
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
    await waitUntilIdle();
    await client.close().catch((closeError: unknown) => {
      logger.error('Failed to close the migrations client', closeError);
    });
  }
};

const migrations: MigrationsExport = { up };
export default migrations;
