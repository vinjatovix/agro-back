import type { UnknownRecord } from '../types/UnknownRecord.js';

export function walkDiff(
  current: UnknownRecord,
  updated: UnknownRecord,
  path: string,
  visit: (k: string, c: unknown, u: unknown, p: string) => void
) {
  const keys = new Set([...Object.keys(current), ...Object.keys(updated)]);

  for (const key of keys) {
    const newPath = path ? `${path}.${key}` : key;

    const c = current[key];
    const u = updated[key];

    visit(key, c, u, newPath);
  }
}
