import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261003120000-plant-listing-indexes.js';

const PLANT_COLLATION = { locale: 'es', strength: 2 };

const LISTING_INDEXES = [
  ['plants_family_idx', { 'identity.family': 1 }],
  ['plants_name_primary_idx', { 'identity.name.primary': 1 }],
  ['plants_scientific_name_idx', { 'identity.scientificName': 1 }]
] as const;

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const INDEX_NOT_FOUND = mongoError(27);

/** A `plants` collection that keeps its indexes in memory. */
const buildPlants = (
  initial: MigrationIndex[] = [],
  { exists = true }: { exists?: boolean } = {}
) => {
  const stored = new Map(initial.map((index) => [index.name, index]));
  let created = exists;

  const indexes = jest.fn((): Promise<MigrationIndex[]> =>
    created
      ? Promise.resolve([...stored.values()])
      : Promise.reject(NAMESPACE_NOT_FOUND)
  );
  const createIndex = jest.fn(
    (
      key: Record<string, number>,
      options: MigrationIndexOptions
    ): Promise<string> => {
      created = true;
      const existing = stored.get(options.name);
      if (
        existing !== undefined &&
        JSON.stringify(existing.collation) !== JSON.stringify(options.collation)
      ) {
        return Promise.reject(mongoError(85));
      }
      stored.set(options.name, { key, ...options });
      return Promise.resolve(options.name);
    }
  );
  const dropIndex = jest.fn((name: string): Promise<void> =>
    stored.delete(name) ? Promise.resolve() : Promise.reject(INDEX_NOT_FOUND)
  );

  const collection: MigrationCollection = { indexes, createIndex, dropIndex };
  const db: MigrationDb = { collection: () => collection };

  return { db, dropIndex, stored };
};

const startupFamilyIndex: MigrationIndex = {
  name: 'plants_family_idx',
  key: { 'identity.family': 1 }
};

describe('plant listing indexes migration', () => {
  describe('up', () => {
    it('should rebuild the family index with the plant collation', async () => {
      const { db, dropIndex, stored } = buildPlants([startupFamilyIndex]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith('plants_family_idx');
      expect(stored.get('plants_family_idx')?.collation).toEqual(
        PLANT_COLLATION
      );
    });

    it.each(LISTING_INDEXES)(
      'should create %s with the plant collation',
      async (name, key) => {
        const { db, stored } = buildPlants([startupFamilyIndex]);

        await up(db);

        expect(stored.get(name)).toEqual(
          expect.objectContaining({ key, collation: PLANT_COLLATION })
        );
      }
    );

    it('should not fail on a database without the plants collection', async () => {
      const { db, stored } = buildPlants([], { exists: false });

      await up(db);

      expect([...stored.keys()]).toEqual(LISTING_INDEXES.map(([name]) => name));
    });

    it('should be harmless when run twice', async () => {
      const { db, dropIndex, stored } = buildPlants([startupFamilyIndex]);
      await up(db);
      const afterFirstRun = [...stored.values()];

      await up(db);

      expect([...stored.values()]).toEqual(afterFirstRun);
      expect(dropIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('down', () => {
    it('should drop the listing indexes and restore the family index without collation', async () => {
      const { db, stored } = buildPlants([startupFamilyIndex]);
      await up(db);

      await down(db);

      expect([...stored.values()]).toEqual([
        expect.objectContaining({ ...startupFamilyIndex })
      ]);
      expect(stored.get('plants_family_idx')?.collation).toBeUndefined();
    });

    it('should not fail when the listing indexes are missing', async () => {
      const { db, stored } = buildPlants();

      await down(db);

      expect([...stored.keys()]).toEqual(['plants_family_idx']);
    });
  });
});
