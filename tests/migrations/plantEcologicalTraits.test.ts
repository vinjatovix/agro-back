import { Readable } from 'node:stream';

import {
  down,
  type MigrationBulkOperation,
  type MigrationDb,
  type MigrationPlant,
  PlantsChangedWhileMigratingError,
  up
} from '../../migrations/scripts/20261005120000-plant-ecological-traits.js';

const ORACLE_KNOWN_SPECIES_FLAGS = {
  potato: { name: 'solanum tuberosum', traits: { edible: true, toxic: true } },
  oleander: { name: 'nerium oleander', traits: { edible: false, toxic: true } }
};

const storedPlant = (
  scientificName: string,
  overrides: Record<string, unknown> = {}
): MigrationPlant => ({
  _id: 'plant-1',
  version: 2,
  identity: { name: { primary: 'Plant' }, scientificName, family: 'fam-1' },
  traits: { lifecycle: 'annual' },
  ...overrides
});

const fakeDb = (
  plants: MigrationPlant[],
  matchedCount?: number
): { db: MigrationDb; written: MigrationBulkOperation[] } => {
  const written: MigrationBulkOperation[] = [];
  const db: MigrationDb = {
    collection: () => ({
      find: () => Readable.from(plants),
      bulkWrite: (operations) => {
        written.push(...operations);
        return Promise.resolve({
          matchedCount: matchedCount ?? operations.length
        });
      }
    })
  };
  return { db, written };
};

const run = async (
  migration: (db: MigrationDb) => Promise<void>,
  plant: MigrationPlant
): Promise<MigrationBulkOperation | undefined> => {
  const { db, written } = fakeDb([plant]);
  await migration(db);
  return written[0];
};

const writtenTraitsOf = async (name: string): Promise<unknown> => {
  const operation = await run(up, storedPlant(name));
  return operation?.updateOne.update.$set?.['traits.ecological'];
};

describe('plant-ecological-traits migration', () => {
  describe('up', () => {
    it('should set the PFAF flags and notes of a known species', async () => {
      const ecological = await writtenTraitsOf(
        ORACLE_KNOWN_SPECIES_FLAGS.potato.name
      );

      expect(ecological).toMatchObject(
        ORACLE_KNOWN_SPECIES_FLAGS.potato.traits
      );
      expect(ecological).toHaveProperty('toxicityNotes');
    });

    it('should match the scientific name ignoring case and spaces', async () => {
      const operation = await run(up, storedPlant('  Nerium Oleander '));

      expect(operation?.updateOne.update.$set).toMatchObject({
        'traits.ecological': ORACLE_KNOWN_SPECIES_FLAGS.oleander.traits
      });
    });

    it(
      'should bump the version and the update metadata, guarded by the' +
        ' version read',
      async () => {
        const operation = await run(
          up,
          storedPlant(ORACLE_KNOWN_SPECIES_FLAGS.potato.name)
        );

        expect(operation?.updateOne.filter).toEqual({
          _id: 'plant-1',
          version: 2
        });
        expect(operation?.updateOne.update.$inc).toEqual({ version: 1 });
        expect(operation?.updateOne.update.$set).toMatchObject({
          'metadata.updatedBy': 'system'
        });
      }
    );

    it('should leave a plant PFAF does not list untouched', async () => {
      const operation = await run(up, storedPlant('plantus imaginarius'));

      expect(operation).toBeUndefined();
    });

    it('should not overwrite ecological traits already stored', async () => {
      const plant = storedPlant(ORACLE_KNOWN_SPECIES_FLAGS.potato.name, {
        traits: { lifecycle: 'annual', ecological: { edible: false } }
      });

      const operation = await run(up, plant);

      expect(operation).toBeUndefined();
    });

    it('should fail when a plant changed while migrating', async () => {
      const { db } = fakeDb(
        [storedPlant(ORACLE_KNOWN_SPECIES_FLAGS.potato.name)],
        0
      );

      await expect(up(db)).rejects.toBeInstanceOf(
        PlantsChangedWhileMigratingError
      );
    });
  });

  describe('down', () => {
    it('should remove the values this migration wrote', async () => {
      const ecological = await writtenTraitsOf(
        ORACLE_KNOWN_SPECIES_FLAGS.potato.name
      );
      const plant = storedPlant(ORACLE_KNOWN_SPECIES_FLAGS.potato.name, {
        traits: { lifecycle: 'annual', ecological }
      });

      const operation = await run(down, plant);

      expect(operation?.updateOne.update.$unset).toEqual({
        'traits.ecological': ''
      });
    });

    it('should keep values edited since the migration', async () => {
      const plant = storedPlant(ORACLE_KNOWN_SPECIES_FLAGS.potato.name, {
        traits: { lifecycle: 'annual', ecological: { edible: true } }
      });

      const operation = await run(down, plant);

      expect(operation).toBeUndefined();
    });
  });
});
