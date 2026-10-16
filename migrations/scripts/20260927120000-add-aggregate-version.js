const VERSIONED_COLLECTIONS = ['beds', 'families', 'plants'];

export const up = async (db) => {
  await Promise.all(
    VERSIONED_COLLECTIONS.map((name) =>
      db
        .collection(name)
        .updateMany({ version: { $exists: false } }, { $set: { version: 0 } })
    )
  );
};

export const down = async (db) => {
  await Promise.all(
    VERSIONED_COLLECTIONS.map((name) =>
      db.collection(name).updateMany({}, { $unset: { version: '' } })
    )
  );
};
