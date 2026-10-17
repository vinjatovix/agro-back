// One external identity (a Google `sub`) belongs to at most one account, and
// `searchByProvider` uses this index instead of scanning `users`. Sparse:
// array elements without `providerUserId` (the `local` method) are not
// indexed, so accounts with a password never collide. Unique by value across
// providers: re-check before adding a provider whose ids could match Google's.
// No data is moved. `up` can run more than once: `createIndex` with the same
// definition is a no-op.

const COLLECTION_NAME = 'users';
const INDEX_NAME = 'users_auth_provider_user_id_unique';
const INDEX_KEY = { 'authMethods.providerUserId': 1 };
const INDEX_OPTIONS = {
  name: INDEX_NAME,
  unique: true,
  sparse: true
};

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

export const up = async (db) => {
  try {
    await db.collection(COLLECTION_NAME).createIndex(INDEX_KEY, INDEX_OPTIONS);
  } catch (error) {
    throw new Error(
      `Cannot create index ${INDEX_NAME} on ${COLLECTION_NAME}: ${error?.message}`,
      { cause: error }
    );
  }
};

export const down = async (db) => {
  try {
    await db.collection(COLLECTION_NAME).dropIndex(INDEX_NAME);
  } catch (error) {
    if (error?.code !== INDEX_NOT_FOUND && error?.code !== NAMESPACE_NOT_FOUND)
      throw error;
  }
};
