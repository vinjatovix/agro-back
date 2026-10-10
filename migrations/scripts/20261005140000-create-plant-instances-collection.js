const COLLECTION_NAME = 'plant_instances';

const INDEXES = [
  {
    key: { userId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 },
    name: 'plant_instances_user_planted_idx'
  },
  {
    key: { userId: 1, bedId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 },
    name: 'plant_instances_user_bed_idx'
  },
  {
    key: { userId: 1, plantId: 1, instanceStatus: 1, plantedAt: -1, _id: -1 },
    name: 'plant_instances_user_plant_idx'
  },
  {
    key: { userId: 1, _id: 1 },
    name: 'plant_instances_user_id_idx'
  },
  {
    key: { bedId: 1, userId: 1, instanceStatus: 1, plantedAt: 1, _id: 1 },
    name: 'plant_instances_bed_active_idx'
  }
];

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;
const NAMESPACE_EXISTS = 48;

const createCollectionIfMissing = async (db, name) => {
  try {
    await db.createCollection(name);
  } catch (error) {
    if (error?.code !== NAMESPACE_EXISTS) throw error;
  }
};

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
    if (
      error?.code !== INDEX_NOT_FOUND &&
      error?.code !== NAMESPACE_NOT_FOUND
    ) {
      throw error;
    }
  }
};

// Field order matters in a compound index, so keys are compared in order.
const sameKey = (actual, expected) =>
  JSON.stringify(Object.entries(actual)) ===
  JSON.stringify(Object.entries(expected));

export const up = async (db) => {
  if (typeof db.createCollection === 'function') {
    await createCollectionIfMissing(db, COLLECTION_NAME);
  }

  const collection = db.collection(COLLECTION_NAME);
  const existingIndexes = await listIndexes(collection);
  const existingByName = new Map(existingIndexes.map((idx) => [idx.name, idx]));

  for (const { key, name } of INDEXES) {
    const existing = existingByName.get(name);
    if (existing !== undefined && sameKey(existing.key, key)) {
      continue;
    }
    // Same name, older definition: rebuilt so `up` always converges to INDEXES.
    if (existing !== undefined) {
      await collection.dropIndex(name);
    }
    await collection.createIndex(key, { name });
  }
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  for (const { name } of INDEXES) {
    await dropIndexIfExists(collection, name);
  }

  if (typeof collection.drop === 'function') {
    try {
      await collection.drop();
    } catch (error) {
      if (error?.code !== NAMESPACE_NOT_FOUND) {
        throw error;
      }
    }
  }
};
