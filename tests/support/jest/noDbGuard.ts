import { MongoClient } from 'mongodb';

const MESSAGE =
  'This test opens a real Mongo connection; rename it to `*.db.test.ts` ' +
  'so it runs in the `db` group.';

/**
 * Setup file of the `no-db` Jest project: a real Mongo connection fails at
 * once. Tests that `jest.mock('mongodb')` keep their own fake client.
 */
MongoClient.prototype.connect = function connect(): Promise<never> {
  // Written right away: callers such as `MongoClientFactory` retry before
  // rethrowing, which can outlast the test timeout and hide the reason.
  process.stderr.write(`\n[no-db] ${MESSAGE}\n`);

  return Promise.reject(new TypeError(MESSAGE));
};
