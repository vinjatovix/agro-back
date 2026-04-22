import type { UnknownRecord } from '../types/UnknownRecord.js';
import { isArray } from './utils/isArray.js';
import { isObject } from './utils/isObject.js';
import { isPrimitive } from './utils/isPrimitive.js';

function applyObjectPatch(
  target: UnknownRecord,
  patch: UnknownRecord
): UnknownRecord {
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

  return result;
}

export function applyPatch<TTarget, TPatch>(
  target: TTarget,
  patch: TPatch
): TTarget {
  if (patch === null || patch === undefined) {
    return target;
  }

  if (typeof patch !== 'object' || typeof target !== 'object') {
    return patch as TTarget;
  }

  return applyObjectPatch(
    target as UnknownRecord,
    patch as UnknownRecord
  ) as TTarget;
}
