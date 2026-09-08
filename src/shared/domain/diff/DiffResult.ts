import type { UnknownRecord } from '../types/UnknownRecord.js';

export type DiffResult = {
  set: UnknownRecord;
  unset: Record<string, ''>;
};
