import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261003130000-account-family-unique-indexes.js';

const UNIQUE_INDEXES = [
  ['users', 'users_email_unique', { email: 1 }],
  ['users', 'users_username_unique', { username: 1 }],
  ['families', 'families_slug_unique', { slug: 1 }]
] as const;

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

type StoredIndex = { key: Record<string, 1> } & MigrationIndexOptions;

type FakeCollection = {
  createIndex: jest.Mock<
    Promise<string>,
    [Record<string, 1>, MigrationIndexOptions]
  >;
  dropIndex: jest.Mock<Promise<unknown>, [string]>;
};

/**
 * In-memory collections that keep their indexes. A collection only exposes
 * index methods, so the migration cannot write data.
 */
const buildDb = () => {
  const stored = new Map<string, Map<string, StoredIndex>>();
  const collections = new Map<string, FakeCollection>();

  const indexesOf = (name: string): Map<string, StoredIndex> => {
    const indexes = stored.get(name) ?? new Map<string, StoredIndex>();
    stored.set(name, indexes);
    return indexes;
  };

  const collection = (name: string): FakeCollection => {
    const existing = collections.get(name);
    if (existing) return existing;

    const created: FakeCollection = {
      createIndex: jest.fn((key, options) => {
        indexesOf(name).set(options.name, { key, ...options });
        return Promise.resolve(options.name);
      }),
      dropIndex: jest.fn((index: string) =>
        indexesOf(name).delete(index)
          ? Promise.resolve()
          : Promise.reject(mongoError(27))
      )
    };
    collections.set(name, created);
    return created;
  };

  const db: MigrationDb = {
    collection: (name: string): MigrationCollection => collection(name)
  };

  return { db, collection, stored };
};

describe('account and family unique indexes migration', () => {
  describe('up', () => {
    it.each(UNIQUE_INDEXES)(
      'should create %s %s as unique on an empty database',
      async (collectionName, name, key) => {
        // Arrange
        const { db, collection } = buildDb();

        // Act
        await up(db);

        // Assert
        expect(collection(collectionName).createIndex).toHaveBeenCalledWith(
          key,
          { name, unique: true }
        );
      }
    );

    it('should leave indexes with the same definition unchanged', async () => {
      // Arrange
      const { db, stored } = buildDb();
      await up(db);
      const afterFirstRun = structuredClone([...stored.entries()]);

      // Act
      await up(db);

      // Assert
      expect([...stored.entries()]).toEqual(afterFirstRun);
    });

    it.each([85, 86])(
      'should stop naming the collection and index on a conflicting definition (code %i)',
      async (code) => {
        // Arrange
        const { db, collection } = buildDb();
        collection('users').createIndex.mockImplementation((_key, options) =>
          options.name === 'users_username_unique'
            ? Promise.reject(mongoError(code))
            : Promise.resolve(options.name)
        );

        // Act
        const result = up(db);

        // Assert
        await expect(result).rejects.toThrow(
          /users_username_unique.*\busers\b/
        );
        expect(collection('users').dropIndex).not.toHaveBeenCalled();
      }
    );

    it('should stop naming the collection and index when duplicates are stored', async () => {
      // Arrange
      const { db, collection } = buildDb();
      collection('families').createIndex.mockRejectedValue(mongoError(11000));

      // Act
      const result = up(db);

      // Assert
      await expect(result).rejects.toThrow(/families_slug_unique.*families/);
      expect(collection('families').dropIndex).not.toHaveBeenCalled();
    });
  });

  describe('down', () => {
    it('should drop the three unique indexes', async () => {
      // Arrange
      const { db, stored } = buildDb();
      await up(db);

      // Act
      await down(db);

      // Assert
      expect(stored.get('users')?.size).toBe(0);
      expect(stored.get('families')?.size).toBe(0);
    });

    it.each([26, 27])(
      'should not fail when an index or collection is missing (code %i)',
      async (code) => {
        // Arrange
        const { db, collection } = buildDb();
        collection('users').dropIndex.mockRejectedValue(mongoError(code));

        // Act
        const result = down(db);

        // Assert
        await expect(result).resolves.toBeUndefined();
      }
    );

    it('should rethrow any other error', async () => {
      // Arrange
      const { db, collection } = buildDb();
      collection('families').dropIndex.mockRejectedValue(mongoError(13));

      // Act
      const result = down(db);

      // Assert
      await expect(result).rejects.toMatchObject({ code: 13 });
    });
  });
});
