// Indexes for the plant listing, built with the collation every plant query
// uses (`MongoPlantRepository.getCollation`): MongoDB only uses an index to
// compare or sort strings when the index has the query's collation.
// - `plants_family_idx` (`identity.family`), created at start-up without a
//   collation and so never used by the `family` filter, is rebuilt with it;
// - `plants_name_primary_idx` and `plants_scientific_name_idx` back the `name`
//   and `scientificName` sort keys.
// The collation is repeated here on purpose: a migration is a frozen snapshot
// and does not import application code. `up` can run more than once.

const PLANTS = 'plants';

const PLANT_COLLATION = { locale: 'es', strength: 2 };

const FAMILY_INDEX = 'plants_family_idx';

const LISTING_INDEXES = [
  { key: { 'identity.family': 1 }, name: FAMILY_INDEX },
  { key: { 'identity.name.primary': 1 }, name: 'plants_name_primary_idx' },
  {
    key: { 'identity.scientificName': 1 },
    name: 'plants_scientific_name_idx'
  }
];

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

export const up = async (db) => {
  const plants = db.collection(PLANTS);

  const indexes = await listIndexes(plants);
  const familyIndex = indexes.find((index) => index.name === FAMILY_INDEX);
  if (familyIndex !== undefined && !hasPlantCollation(familyIndex)) {
    await plants.dropIndex(FAMILY_INDEX);
  }

  for (const { key, name } of LISTING_INDEXES) {
    await plants.createIndex(key, { name, collation: PLANT_COLLATION });
  }
};

export const down = async (db) => {
  const plants = db.collection(PLANTS);

  for (const { name } of LISTING_INDEXES) {
    await dropIndexIfExists(plants, name);
  }

  await plants.createIndex({ 'identity.family': 1 }, { name: FAMILY_INDEX });
};
