/**
 * Deep copy of a read view that keeps `Date` values as `Date` of this realm
 * (`structuredClone` returns dates the response schemas do not recognise
 * under Jest).
 */
export const cloneView = (value: unknown): Record<string, unknown> =>
  cloneValue(value) as Record<string, unknown>;

const cloneValue = (value: unknown): unknown => {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)])
    );
  }

  return value;
};
