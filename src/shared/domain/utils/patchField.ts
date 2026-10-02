/**
 * PATCH semantics for one optional field: an absent (`undefined`) change keeps
 * the current value, `null` removes it, and any other value is merged into the
 * current one by `merge`.
 */
export const mergePatchField = <C, T>(
  change: C | null | undefined,
  current: T | undefined,
  merge: (change: C, current: T | undefined) => T | undefined
): T | undefined => {
  if (change === null) return undefined;
  if (change === undefined) return current;
  return merge(change, current);
};

/** {@link mergePatchField} where a given value replaces the current one. */
export const patchField = <T>(
  change: T | null | undefined,
  current: T | undefined
): T | undefined => mergePatchField(change, current, (value: T) => value);
