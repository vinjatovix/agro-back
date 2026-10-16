import {
  down,
  type MigrationDb,
  up
} from '../../migrations/scripts/20260927120000-add-aggregate-version.js';

const VERSIONED_COLLECTIONS = ['beds', 'families', 'plants'];

type RecordedCall = {
  collection: string;
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
};

const fakeDb = (failing?: {
  collection: string;
  error: Error;
}): { db: MigrationDb; calls: RecordedCall[] } => {
  const calls: RecordedCall[] = [];
  const db: MigrationDb = {
    collection: (collection: string) => ({
      updateMany: (
        filter: Record<string, unknown>,
        update: Record<string, unknown>
      ) => {
        calls.push({ collection, filter, update });
        return failing?.collection === collection
          ? Promise.reject(failing.error)
          : Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
      }
    })
  };
  return { db, calls };
};

const callsOf = (calls: RecordedCall[], collection: string): RecordedCall[] =>
  calls.filter((call) => call.collection === collection);

describe('add-aggregate-version migration', () => {
  describe('up', () => {
    it.each(VERSIONED_COLLECTIONS)(
      'should set version 0 on the %s without one',
      async (collection) => {
        const { db, calls } = fakeDb();

        await up(db);

        expect(callsOf(calls, collection)).toEqual([
          {
            collection,
            filter: { version: { $exists: false } },
            update: { $set: { version: 0 } }
          }
        ]);
      }
    );

    it('should touch only the versioned collections', async () => {
      const { db, calls } = fakeDb();

      await up(db);

      expect(calls.map((call) => call.collection).sort()).toEqual(
        VERSIONED_COLLECTIONS
      );
    });

    it('should reject with the error of a failing update', async () => {
      const error = new Error('write failed');
      const { db } = fakeDb({ collection: 'families', error });

      await expect(up(db)).rejects.toBe(error);
    });
  });

  describe('down', () => {
    it.each(VERSIONED_COLLECTIONS)(
      'should remove the version of every document in %s',
      async (collection) => {
        const { db, calls } = fakeDb();

        await down(db);

        expect(callsOf(calls, collection)).toEqual([
          { collection, filter: {}, update: { $unset: { version: '' } } }
        ]);
      }
    );

    it('should reject with the error of a failing update', async () => {
      const error = new Error('write failed');
      const { db } = fakeDb({ collection: 'plants', error });

      await expect(down(db)).rejects.toBe(error);
    });
  });
});
