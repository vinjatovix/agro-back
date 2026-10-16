import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261005140000-create-plant-instances-collection.js';

const INDEXES = [
  [
    'plant_instances_user_planted_idx',
    { userId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 }
  ],
  [
    'plant_instances_user_bed_idx',
    { userId: 1, bedId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 }
  ],
  [
    'plant_instances_user_plant_idx',
    { userId: 1, plantId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 }
  ],
  ['plant_instances_user_id_idx', { userId: 1, _id: 1 }],
  [
    'plant_instances_bed_active_idx',
    { bedId: 1, userId: 1, instanceStatus: 1, plantedAt: 1, _id: 1 }
  ]
] as const;

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const INDEX_NOT_FOUND = mongoError(27);
const NAMESPACE_EXISTS = mongoError(48);
const UNAUTHORIZED = mongoError(13);

const buildDb = (
  initialIndexes: MigrationIndex[] = [],
  {
    exists = true,
    createCollectionError
  }: { exists?: boolean; createCollectionError?: Error } = {}
) => {
  const stored = new Map(initialIndexes.map((idx) => [idx.name, idx]));
  let collectionExists = exists;

  const indexes = jest.fn((): Promise<MigrationIndex[]> =>
    collectionExists
      ? Promise.resolve([...stored.values()])
      : Promise.reject(NAMESPACE_NOT_FOUND)
  );

  const createIndex = jest.fn(
    (
      key: Record<string, number>,
      options: MigrationIndexOptions
    ): Promise<string> => {
      collectionExists = true;
      stored.set(options.name, { key, ...options });
      return Promise.resolve(options.name);
    }
  );

  const dropIndex = jest.fn((name: string): Promise<unknown> =>
    stored.delete(name) ? Promise.resolve() : Promise.reject(INDEX_NOT_FOUND)
  );

  const drop = jest.fn((): Promise<boolean> => {
    if (!collectionExists) {
      return Promise.reject(NAMESPACE_NOT_FOUND);
    }
    collectionExists = false;
    stored.clear();
    return Promise.resolve(true);
  });

  const collection: MigrationCollection = {
    indexes,
    createIndex,
    dropIndex,
    drop
  };

  const createCollection = jest.fn((_name: string): Promise<unknown> => {
    if (createCollectionError) return Promise.reject(createCollectionError);
    if (collectionExists) return Promise.reject(NAMESPACE_EXISTS);
    collectionExists = true;
    return Promise.resolve();
  });

  const db: MigrationDb = {
    collection: () => collection,
    createCollection
  };

  return { db, stored, createCollection, createIndex, dropIndex, drop };
};

describe('create plant_instances collection migration', () => {
  describe('up', () => {
    it.each(INDEXES)(
      'should create compound index %s with key %j',
      async (name, key) => {
        const { db, stored } = buildDb();

        await up(db);

        expect(stored.get(name)).toEqual({
          name,
          key
        });
      }
    );

    it('creates collection if it did not exist', async () => {
      const { db, createCollection } = buildDb([], { exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('plant_instances');
    });

    it('propagates a collection creation error other than "already exists"', async () => {
      const { db } = buildDb([], {
        exists: false,
        createCollectionError: UNAUTHORIZED
      });

      await expect(up(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('rebuilds an index that has the expected name but an older key', async () => {
      const { db, stored } = buildDb([
        {
          name: 'plant_instances_user_planted_idx',
          key: { userId: 1, instanceStatus: 1, plantedAt: -1 }
        }
      ]);

      await up(db);

      expect(stored.get('plant_instances_user_planted_idx')?.key).toEqual({
        userId: 1,
        instanceStatus: 1,
        plantedAt: -1,
        _id: -1
      });
    });

    it('skips every index already present with the same key', async () => {
      const { db, createIndex, dropIndex } = buildDb(
        INDEXES.map(([name, key]) => ({ name, key }))
      );

      await up(db);

      expect(createIndex).not.toHaveBeenCalled();
      expect(dropIndex).not.toHaveBeenCalled();
    });

    it('drops an index with an older key before creating it again', async () => {
      const { db, createIndex, dropIndex } = buildDb([
        {
          name: 'plant_instances_user_id_idx',
          key: { userId: 1 }
        }
      ]);

      await up(db);

      const recreated = createIndex.mock.calls.findIndex(
        ([, options]) => options.name === 'plant_instances_user_id_idx'
      );
      expect(dropIndex).toHaveBeenCalledWith('plant_instances_user_id_idx');
      expect(createIndex.mock.invocationCallOrder[recreated]).toBeGreaterThan(
        dropIndex.mock.invocationCallOrder[0] ?? Infinity
      );
    });

    it('rejects with the error of a failing index creation', async () => {
      const { db, createIndex } = buildDb();
      createIndex.mockImplementation((_key, options) =>
        options.name === 'plant_instances_user_bed_idx'
          ? Promise.reject(UNAUTHORIZED)
          : Promise.resolve(options.name)
      );

      await expect(up(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('is idempotent when run multiple times', async () => {
      const { db, stored } = buildDb();

      await up(db);
      const afterFirstRun = new Map(stored);

      await up(db);

      expect(stored).toEqual(afterFirstRun);
    });
  });

  describe('down', () => {
    it('drops all indexes and drops the collection', async () => {
      const { db, stored, drop } = buildDb();
      await up(db);

      await down(db);

      expect(drop).toHaveBeenCalled();
      expect(stored.size).toBe(0);
    });

    it('drops every index before dropping the collection', async () => {
      const { db, dropIndex, drop } = buildDb();
      await up(db);

      await down(db);

      expect(dropIndex.mock.calls.map(([name]) => name).sort()).toEqual(
        INDEXES.map(([name]) => name).sort()
      );
      expect(drop.mock.invocationCallOrder[0]).toBeGreaterThan(
        Math.max(...dropIndex.mock.invocationCallOrder)
      );
    });

    it('rejects with the error of a failing index drop', async () => {
      const { db, dropIndex } = buildDb();
      await up(db);
      dropIndex.mockRejectedValueOnce(UNAUTHORIZED);

      await expect(down(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('does not fail when the collection does not exist', async () => {
      const { db } = buildDb([], { exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });
  });
});
