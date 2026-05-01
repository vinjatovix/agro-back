import type { UnknownRecord } from '../../types/UnknownRecord.js';

export const isObject = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
