import { isRecord } from '../../../../../../src/shared/domain/patch/utils/isRecord.js';

export const compareResponseObject = <T extends Record<string, unknown>>(
  responseObj: T,
  expectedObj: Partial<T>
): boolean => {
  const compare = (actual: unknown, expected: unknown): boolean => {
    if (expected === undefined) return true;
    if (expected === null) return actual === null;

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;

      return expected.every((expectedItem) =>
        actual.some((actualItem) => compare(actualItem, expectedItem))
      );
    }

    if (isRecord(expected)) {
      if (!isRecord(actual)) return false;

      return Object.entries(expected).every(([key, value]) =>
        compare(actual[key], value)
      );
    }

    return actual === expected;
  };

  return compare(responseObj, expectedObj);
};
