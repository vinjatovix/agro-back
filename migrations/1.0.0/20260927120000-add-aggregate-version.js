const VERSIONED_COLLECTIONS = ['beds', 'families', 'plants'];

export const up = async (db) => {
  for (const name of VERSIONED_COLLECTIONS) {
    await db
      .collection(name)
      .updateMany({ version: { $exists: false } }, { $set: { version: 0 } });
  }
};

export const down = async (db) => {
  for (const name of VERSIONED_COLLECTIONS) {
    await db.collection(name).updateMany({}, { $unset: { version: '' } });
  }
};
