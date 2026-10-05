// Fixes corrupted slug 'mmontiaceaeontiaceae' for the Montiaceae family to 'montiaceae'.
// Updates update metadata and increments version.

const FAMILIES = 'families';
const OLD_SLUG = 'mmontiaceaeontiaceae';
const NEW_SLUG = 'montiaceae';
const MIGRATION_USER = 'system';

export const up = async (db) => {
  await db.collection(FAMILIES).updateMany(
    { slug: OLD_SLUG },
    {
      $set: {
        slug: NEW_SLUG,
        'metadata.updatedAt': new Date(),
        'metadata.updatedBy': MIGRATION_USER
      },
      $inc: { version: 1 }
    }
  );
};

export const down = async (db) => {
  await db.collection(FAMILIES).updateMany(
    { slug: NEW_SLUG, scientificName: 'Montiaceae' },
    {
      $set: {
        slug: OLD_SLUG,
        'metadata.updatedAt': new Date(),
        'metadata.updatedBy': MIGRATION_USER
      },
      $inc: { version: 1 }
    }
  );
};
