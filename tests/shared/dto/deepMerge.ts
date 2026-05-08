import { isObject } from '../../../src/shared/domain/patch/utils/isObject.js';

export function deepMerge<T>(target: T, patch: unknown): T {
  if (!isObject(target) || !isObject(patch)) {
    return patch as T;
  }

  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(patch)) {
    const tVal = (target as Record<string, unknown>)[key];
    const pVal = patch[key];

    if (isObject(tVal) && isObject(pVal)) {
      result[key] = deepMerge(tVal, pVal);
    } else {
      result[key] = pVal;
    }
  }

  return result as T;
}
