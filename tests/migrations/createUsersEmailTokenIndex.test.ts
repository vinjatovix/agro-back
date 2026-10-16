import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261016120000-create-users-email-token-index.js';

const INDEX_NAME = 'users_email_token_hash_unique';

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

type FakeCollection = {
  createIndex: jest.Mock<
    Promise<string>,
    [Record<string, 1>, MigrationIndexOptions]
  >;
  dropIndex: jest.Mock<Promise<unknown>, [string]>;
};

/** One in-memory `users` collection that only exposes index methods. */
const buildDb = () => {
  const stored = new Map<string, MigrationIndexOptions>();
  const users: FakeCollection = {
    createIndex: jest.fn((_key, options) => {
      stored.set(options.name, options);
      return Promise.resolve(options.name);
    }),
    dropIndex: jest.fn((name: string) =>
      stored.delete(name) ? Promise.resolve() : Promise.reject(mongoError(27))
    )
  };
  const collection = jest.fn((): MigrationCollection => users);
  const db: MigrationDb = { collection };

  return { db, users, collection, stored };
};

describe('users email token index migration', () => {
  describe('up', () => {
    it('should create a unique partial index on the token hash of users', async () => {
      const { db, users, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('users');
      expect(users.createIndex).toHaveBeenCalledWith(
        { 'emailTokens.tokenHash': 1 },
        {
          name: INDEX_NAME,
          unique: true,
          partialFilterExpression: {
            'emailTokens.tokenHash': { $exists: true }
          }
        }
      );
    });

    it('should stop naming the collection and index, keeping the cause', async () => {
      const { db, users } = buildDb();
      const error = mongoError(11000);
      users.createIndex.mockRejectedValue(error);

      const result = up(db);

      await expect(result).rejects.toThrow(
        /users_email_token_hash_unique.*\busers\b/
      );
      await expect(result).rejects.toMatchObject({ cause: error });
    });
  });

  describe('down', () => {
    it('should drop the index', async () => {
      const { db, stored } = buildDb();
      await up(db);

      await down(db);

      expect(stored.size).toBe(0);
    });

    it.each([26, 27])(
      'should not fail when the index or collection is missing (code %i)',
      async (code) => {
        const { db, users } = buildDb();
        users.dropIndex.mockRejectedValue(mongoError(code));

        const result = down(db);

        await expect(result).resolves.toBeUndefined();
      }
    );

    it('should rethrow any other error', async () => {
      const { db, users } = buildDb();
      users.dropIndex.mockRejectedValue(mongoError(13));

      const result = down(db);

      await expect(result).rejects.toMatchObject({ code: 13 });
    });
  });
});
