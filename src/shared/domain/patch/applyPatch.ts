import type { UnknownRecord } from '../types/UnknownRecord.js';
import type { DeepPartial } from './DeepPartial.js';
import { isArray } from './utils/isArray.js';
import { isObject } from './utils/isObject.js';
import { isPrimitive } from './utils/isPrimitive.js';

function applyObjectPatch<T extends UnknownRecord>(
  target: T,
  patch: DeepPartial<T>
): T {
  const result: UnknownRecord = { ...target };

  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    const targetValue = target[key];

    // 1. NO OP
    if (patchValue === undefined) {
      continue;
    }

    // 2. CLEAR
    if (patchValue === null) {
      result[key] = null;
      continue;
    }

    // 3. ARRAYS → REPLACE TOTAL
    if (isArray(patchValue)) {
      result[key] = patchValue;
      continue;
    }

    // 4. NESTED OBJECT → RECURSIVE PATCH
    if (isObject(patchValue) && isObject(targetValue)) {
      result[key] = applyObjectPatch(targetValue, patchValue);
      continue;
    }

    // 5. PRIMITIVE → REPLACE
    if (isPrimitive(patchValue)) {
      result[key] = patchValue;
      continue;
    }

    result[key] = patchValue;
  }

  return result as T;
}

export function applyPatch<T>(target: T, patch: DeepPartial<T>): T {
  if (patch === null || patch === undefined) {
    return target;
  }

  if (typeof patch !== 'object' || typeof target !== 'object') {
    return patch as T;
  }

  return applyObjectPatch(target as UnknownRecord, patch as UnknownRecord) as T;
}
