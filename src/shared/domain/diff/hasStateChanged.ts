import { createError } from '../../errors/index.js';
import type { UnknownRecord } from '../types/UnknownRecord.js';
import { diffObjects } from './diffObjects.js';

/**
 * Same definition of "different" as storage uses to build its patch, so an
 * aggregate that reports a change always yields a non-empty storage diff.
 *
 * Receives plain snapshots only (primitives, `Date`, arrays and plain
 * objects), never value objects: `diffObjects` only sees own enumerable keys,
 * so data kept in a `Set`, a `Map` or a private field would read as
 * "unchanged" and the change would be silently lost. Anything else fails fast.
 */
export function hasStateChanged(
  before: UnknownRecord,
  after: UnknownRecord
): boolean {
  assertPlainSnapshot(before, 'before');
  assertPlainSnapshot(after, 'after');

  const { set, unset } = diffObjects(before, after);

  return Object.keys(set).length > 0 || Object.keys(unset).length > 0;
}

function assertPlainSnapshot(value: unknown, path: string): void {
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertPlainSnapshot(item, `${path}[${index}]`)
    );
    return;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    // `constructor` may be missing (e.g. a prototype built with
    // `Object.create(null)`); reading `.name` from it must not hide this error.
    const typeName = (value as { constructor?: { name?: string } }).constructor
      ?.name;

    throw createError.internal(
      `hasStateChanged expects plain snapshots, got ${typeName ?? 'an object with a custom prototype'} at ${path}`
    );
  }

  for (const [key, nested] of Object.entries(value)) {
    assertPlainSnapshot(nested, `${path}.${key}`);
  }
}
