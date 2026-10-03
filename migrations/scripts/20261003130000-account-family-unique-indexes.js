// Unique rules on account email and username and on family slug, created at
// start-up until now. Names and options are kept, so databases where start-up
// already built them pass unchanged: `createIndex` with the same definition is
// a no-op. A different definition under the same name, or stored duplicates,
// make MongoDB reject the index; the error is rethrown naming the collection
// and the index, and no data is changed. `up` can run more than once.

const UNIQUE_INDEXES = [
  { collection: 'users', key: { email: 1 }, name: 'users_email_unique' },
  { collection: 'users', key: { username: 1 }, name: 'users_username_unique' },
  { collection: 'families', key: { slug: 1 }, name: 'families_slug_unique' }
];

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

export const up = async (db) => {
  for (const { collection, key, name } of UNIQUE_INDEXES) {
    try {
      await db.collection(collection).createIndex(key, { name, unique: true });
    } catch (error) {
      throw new Error(
        `Cannot create index ${name} on ${collection}: ${error?.message}`,
        { cause: error }
      );
    }
  }
};

export const down = async (db) => {
  for (const { collection, name } of UNIQUE_INDEXES) {
    try {
      await db.collection(collection).dropIndex(name);
    } catch (error) {
      if (
        error?.code !== INDEX_NOT_FOUND &&
        error?.code !== NAMESPACE_NOT_FOUND
      )
        throw error;
    }
  }
};
