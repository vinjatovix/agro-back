// Unique lookup of an account by the hash of a one-time email token
// (activation now, password reset later). Partial: only documents holding a
// token are indexed, so accounts without `emailTokens` never collide. No data
// is moved. `up` can run more than once: `createIndex` with the same
// definition is a no-op.

const COLLECTION_NAME = 'users';
const INDEX_NAME = 'users_email_token_hash_unique';
const INDEX_KEY = { 'emailTokens.tokenHash': 1 };
const INDEX_OPTIONS = {
  name: INDEX_NAME,
  unique: true,
  partialFilterExpression: { 'emailTokens.tokenHash': { $exists: true } }
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
