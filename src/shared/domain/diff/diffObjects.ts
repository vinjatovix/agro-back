import { isObject } from '../patch/utils/isObject.js';
import type { UnknownRecord } from '../types/UnknownRecord.js';

export type DiffResult = {
  set: UnknownRecord;
  unset: Record<string, ''>;
};

export function diffObjects(
  current: UnknownRecord,
  updated: UnknownRecord,
  parentPath = ''
): DiffResult {
  const set: UnknownRecord = {};
  const unset: Record<string, ''> = {};

  const keys = new Set([...Object.keys(current), ...Object.keys(updated)]);

  for (const key of keys) {
    const currentValue = current[key];
    const updatedValue = updated[key];

    const path = parentPath ? `${parentPath}.${key}` : key;

    // 1. NO OP
    if (updatedValue === undefined) {
      continue;
    }

    // 2. UNSET
    if (updatedValue === null) {
      unset[path] = '';
      continue;
    }

    // 3. NEW FIELD
    if (currentValue === undefined) {
      set[path] = updatedValue;
      continue;
    }

    // 4. ARRAYS → REPLACE TOTAL
    if (Array.isArray(updatedValue)) {
      set[path] = updatedValue;
      continue;
    }

    // 5. OBJECTS → DEEP DIFF
    if (isObject(currentValue) && isObject(updatedValue)) {
      const nested = diffObjects(currentValue, updatedValue, path);

      Object.assign(set, nested.set);
      Object.assign(unset, nested.unset);
      continue;
    }

    // 6. PRIMITIVES → DIRECT COMPARISON
    if (currentValue !== updatedValue) {
      set[path] = updatedValue;
    }
  }

  return { set, unset };
}
