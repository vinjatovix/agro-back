import {
  down,
  type MigrationDb,
  up
} from '../../migrations/scripts/20261005130000-fix-montiaceae-family-slug.js';

type RecordedCall = {
  collection: string;
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
};

const fakeDb = (): { db: MigrationDb; calls: RecordedCall[] } => {
  const calls: RecordedCall[] = [];
  const db: MigrationDb = {
    collection: (collection: string) => ({
      updateMany: (
        filter: Record<string, unknown>,
        update: Record<string, unknown>
      ) => {
        calls.push({ collection, filter, update });
        return Promise.resolve({ matchedCount: 1, modifiedCount: 1 });
      }
    })
  };
  return { db, calls };
};

describe('fix-montiaceae-family-slug migration', () => {
  describe('up', () => {
    it('should update the corrupted slug to montiaceae and bump version', async () => {
      const { db, calls } = fakeDb();

      await up(db);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.collection).toBe('families');
      expect(calls[0]?.filter).toEqual({ slug: 'mmontiaceaeontiaceae' });
      expect(calls[0]?.update).toMatchObject({
        $set: {
          slug: 'montiaceae',
          'metadata.updatedBy': 'system'
        },
        $inc: { version: 1 }
      });
      expect(
        (calls[0]?.update.$set as Record<string, unknown>)?.[
          'metadata.updatedAt'
        ]
      ).toBeInstanceOf(Date);
    });
  });

  describe('down', () => {
    it('should revert the slug to mmontiaceaeontiaceae', async () => {
      const { db, calls } = fakeDb();

      await down(db);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.collection).toBe('families');
      expect(calls[0]?.filter).toEqual({
        slug: 'montiaceae',
        scientificName: 'Montiaceae'
      });
      expect(calls[0]?.update).toMatchObject({
        $set: {
          slug: 'mmontiaceaeontiaceae',
          'metadata.updatedBy': 'system'
        },
        $inc: { version: 1 }
      });
      expect(
        (calls[0]?.update.$set as Record<string, unknown>)?.[
          'metadata.updatedAt'
        ]
      ).toBeInstanceOf(Date);
    });
  });
});
