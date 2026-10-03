import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  type RepeatedName,
  up
} from '../../migrations/scripts/20261003131000-plant-scientific-name-unique.js';

const PLANT_COLLATION = { locale: 'es', strength: 2 };

const KEY = { 'identity.scientificName': 1 };

const UNIQUE_INDEX = 'plants_scientific_name_unique';
const SORT_INDEX = 'plants_scientific_name_idx';
const UNDECLARED_INDEX = 'plants_scientificName_unique';

const REPEATED_NAMES_PIPELINE = [
  { $group: { _id: '$identity.scientificName', n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } },
  { $limit: 5 }
];

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const sortIndex: MigrationIndex = {
  name: SORT_INDEX,
  key: KEY,
  collation: PLANT_COLLATION
};

const undeclaredIndex: MigrationIndex = {
  name: UNDECLARED_INDEX,
  key: KEY,
  unique: true
};

const migratedIndex: MigrationIndex = {
  name: UNIQUE_INDEX,
  key: KEY,
  unique: true,
  collation: PLANT_COLLATION
};

/** A `plants` collection that keeps its indexes in memory. */
const buildPlants = (
  initial: MigrationIndex[] = [],
  {
    exists = true,
    repeated = []
  }: { exists?: boolean; repeated?: RepeatedName[] } = {}
) => {
  const stored = new Map(initial.map((index) => [index.name, index]));
  const calls: string[] = [];
  let created = exists;

  const indexes = jest.fn((): Promise<MigrationIndex[]> =>
    created
      ? Promise.resolve([...stored.values()])
      : Promise.reject(mongoError(26))
  );
  const createIndex = jest.fn(
    (
      key: Record<string, number>,
      options: MigrationIndexOptions
    ): Promise<string> => {
      calls.push(`create ${options.name}`);
      created = true;
      stored.set(options.name, { key, ...options });
      return Promise.resolve(options.name);
    }
  );
  const dropIndex = jest.fn((name: string): Promise<void> => {
    calls.push(`drop ${name}`);
    return stored.delete(name)
      ? Promise.resolve()
      : Promise.reject(mongoError(27));
  });
  const aggregate = jest.fn(() => {
    calls.push('aggregate');
    return { toArray: () => Promise.resolve(repeated) };
  });

  const collection: MigrationCollection = {
    indexes,
    createIndex,
    dropIndex,
    aggregate
  };
  const db: MigrationDb = { collection: () => collection };

  return { db, stored, calls, createIndex, dropIndex, aggregate };
};

const scientificNameIndexes = (
  stored: Map<string, MigrationIndex>
): MigrationIndex[] =>
  [...stored.values()].filter(
    (index) => index.key['identity.scientificName'] !== undefined
  );

describe('plant scientific name unique migration', () => {
  describe('up', () => {
    it('should replace both old indexes with one unique collated index', async () => {
      const { db, stored, calls } = buildPlants([sortIndex, undeclaredIndex]);

      await up(db);

      expect(scientificNameIndexes(stored)).toEqual([
        expect.objectContaining(migratedIndex)
      ]);
      expect(calls).toEqual([
        'aggregate',
        `drop ${SORT_INDEX}`,
        `create ${UNIQUE_INDEX}`,
        `drop ${UNDECLARED_INDEX}`
      ]);
    });

    it('should look for names repeated ignoring case with the plant collation', async () => {
      const { db, aggregate } = buildPlants([sortIndex]);

      await up(db);

      expect(aggregate).toHaveBeenCalledWith(REPEATED_NAMES_PIPELINE, {
        collation: PLANT_COLLATION
      });
    });

    it.each([
      ['only the sort index', [sortIndex], {}],
      ['no plant indexes', [], {}],
      ['no plants collection', [], { exists: false }]
    ])(
      'should end with the single unique index from %s',
      async (_case, initial, options) => {
        const { db, stored } = buildPlants(initial, options);

        await up(db);

        expect(scientificNameIndexes(stored)).toEqual([
          expect.objectContaining(migratedIndex)
        ]);
      }
    );

    it('should do nothing on an already migrated database', async () => {
      const { db, aggregate, createIndex, dropIndex } = buildPlants([
        migratedIndex
      ]);

      await up(db);

      expect(aggregate).not.toHaveBeenCalled();
      expect(createIndex).not.toHaveBeenCalled();
      expect(dropIndex).not.toHaveBeenCalled();
    });

    it('should stop before dropping anything when names are repeated ignoring case', async () => {
      const { db, createIndex, dropIndex } = buildPlants([sortIndex], {
        repeated: [{ _id: 'Solanum lycopersicum', n: 2 }]
      });

      const result = up(db);

      await expect(result).rejects.toThrow(/plants.*Solanum lycopersicum/);
      expect(dropIndex).not.toHaveBeenCalled();
      expect(createIndex).not.toHaveBeenCalled();
    });

    it('should stop naming the collection and index when the index cannot be built', async () => {
      const { db, createIndex } = buildPlants([sortIndex]);
      createIndex.mockRejectedValueOnce(mongoError(11000));

      const result = up(db);

      await expect(result).rejects.toThrow(
        /plants_scientific_name_unique.*\bplants\b/
      );
    });
  });

  describe('down', () => {
    it('should restore the sort index and the case-sensitive unique index', async () => {
      const { db, stored } = buildPlants([migratedIndex]);

      await down(db);

      expect(scientificNameIndexes(stored)).toEqual([
        expect.objectContaining(sortIndex),
        expect.objectContaining(undeclaredIndex)
      ]);
      expect(stored.get(SORT_INDEX)?.unique).toBeUndefined();
      expect(stored.get(UNDECLARED_INDEX)?.collation).toBeUndefined();
    });

    it.each([26, 27])(
      'should not fail when the unique index is missing (code %i)',
      async (code) => {
        const { db, dropIndex, stored } = buildPlants();
        dropIndex.mockRejectedValueOnce(mongoError(code));

        await down(db);

        expect([...stored.keys()]).toEqual([SORT_INDEX, UNDECLARED_INDEX]);
      }
    );
  });
});
