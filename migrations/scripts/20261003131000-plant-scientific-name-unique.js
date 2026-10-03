// Plant scientific names are unique ignoring letter case, with one declared
// index that also serves the listing sort. It replaces the non-unique sort
// index `plants_scientific_name_idx` and `plants_scientificName_unique`, a
// case-sensitive unique index found in local databases and declared nowhere.
// MongoDB does not allow two indexes that differ only in `unique`, so the sort
// index is dropped before the unique one is created.
// Repeated names are looked for before dropping anything: the migration stops
// and lists them, and never changes data. Soft-deleted plants keep their name
// reserved (no partial index, which would stop serving the listing sort).
// The collation is repeated here on purpose: a migration is a frozen snapshot
// and does not import application code. `up` can run more than once.

const PLANTS = 'plants';

const PLANT_COLLATION = { locale: 'es', strength: 2 };

const KEY = { 'identity.scientificName': 1 };

const UNIQUE_INDEX = 'plants_scientific_name_unique';
const SORT_INDEX = 'plants_scientific_name_idx';
const UNDECLARED_INDEX = 'plants_scientificName_unique';

const MAX_REPEATED_NAMES = 5;

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

const listIndexes = async (collection) => {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.code === NAMESPACE_NOT_FOUND) return [];
    throw error;
  }
};

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
  } catch (error) {
    if (error?.code !== INDEX_NOT_FOUND && error?.code !== NAMESPACE_NOT_FOUND)
      throw error;
  }
};

const hasPlantCollation = (index) =>
  index.collation?.locale === PLANT_COLLATION.locale &&
  index.collation?.strength === PLANT_COLLATION.strength;

const findRepeatedNames = async (plants) => {
  const repeated = await plants
    .aggregate(
      [
        { $group: { _id: '$identity.scientificName', n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $limit: MAX_REPEATED_NAMES }
      ],
      { collation: PLANT_COLLATION }
    )
    .toArray();

  return repeated.map(({ _id }) => _id ?? '<null/missing>');
};

export const up = async (db) => {
  const plants = db.collection(PLANTS);

  const indexes = await listIndexes(plants);
  const byName = (name) => indexes.find((index) => index.name === name);
  const uniqueIndex = byName(UNIQUE_INDEX);
  const sortIndex = byName(SORT_INDEX);
  const undeclaredIndex = byName(UNDECLARED_INDEX);

  const alreadyMigrated =
    uniqueIndex?.unique === true &&
    hasPlantCollation(uniqueIndex) &&
    sortIndex === undefined &&
    undeclaredIndex === undefined;
  if (alreadyMigrated) return;

  const repeated = await findRepeatedNames(plants);
  if (repeated.length > 0) {
    throw new Error(
      `Cannot create index ${UNIQUE_INDEX} on ${PLANTS}: scientific names repeated ignoring case: ${repeated.join(', ')}`
    );
  }

  if (sortIndex !== undefined) await plants.dropIndex(SORT_INDEX);

  try {
    await plants.createIndex(KEY, {
      name: UNIQUE_INDEX,
      unique: true,
      collation: PLANT_COLLATION
    });
  } catch (error) {
    throw new Error(
      `Cannot create index ${UNIQUE_INDEX} on ${PLANTS}: ${error?.message}`,
      { cause: error }
    );
  }

  if (undeclaredIndex !== undefined) await plants.dropIndex(UNDECLARED_INDEX);
};

export const down = async (db) => {
  const plants = db.collection(PLANTS);

  await dropIndexIfExists(plants, UNIQUE_INDEX);

  await plants.createIndex(KEY, {
    name: SORT_INDEX,
    collation: PLANT_COLLATION
  });
  await plants.createIndex(KEY, { name: UNDECLARED_INDEX, unique: true });
};
