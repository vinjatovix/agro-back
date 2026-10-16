import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

// Jest loads this file with Node's `require`, which ignores `moduleNameMapper`
// and cannot follow the `.js` imports of `src/`, so it reads `.env.test`
// itself. It only checks that the server answers; the tests connect with the
// full configuration.

const SERVER_SELECTION_TIMEOUT_MS = 2000;

/**
 * `globalSetup` of the `db` Jest project: one ping before any file runs, so a
 * stopped database fails the group once instead of once per file.
 */
export default async function dbGlobalSetup(): Promise<void> {
  config({ path: '.env.test', override: true, quiet: true });
  const client = new MongoClient(`mongodb://${process.env.MONGO_URL ?? ''}`, {
    directConnection: true,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS
  });

  try {
    await client.db('admin').command({ ping: 1 });
  } catch {
    throw new TypeError(
      'The test database is not reachable. Start it with `npm run docker:mongo`.'
    );
  } finally {
    await client.close();
  }
}
