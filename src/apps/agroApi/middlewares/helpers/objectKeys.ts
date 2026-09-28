const keysOf = (value: unknown): string[] =>
  typeof value === 'object' && value !== null ? Object.keys(value) : [];

/**
 * `custom()` validator: the object only carries the listed keys. Needed under
 * a field validated as a whole object, which `checkExact()` treats as fully
 * known.
 */
export const hasOnlyKeys =
  (allowed: readonly string[]) =>
  (value: unknown): boolean =>
    keysOf(value).every((key) => allowed.includes(key));

/** `custom()` validator: every key of the object matches `pattern`. */
export const hasKeysMatching =
  (pattern: RegExp) =>
  (value: unknown): boolean =>
    keysOf(value).every((key) => pattern.test(key));
