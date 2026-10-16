// Also reported by the request schemas, so both layers answer the same text.
export const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'Passwords do not match';

// A compare-and-set write lost a race with another change of the account.
export const CONCURRENT_CHANGE_MESSAGE =
  'The account was modified concurrently, try again';

// Checked by registration and by the unique index, never echoing the value.
export const USERNAME_TAKEN_MESSAGE = 'Username already in use';
