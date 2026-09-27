import type { DiffAction } from './DiffAction.js';

export function resolveDiffAction(
  currentValue: unknown,
  updatedValue: unknown
): DiffAction {
  if (updatedValue === undefined) return 'noop';
  if (updatedValue === null) {
    // Clearing a field that is already empty changes nothing, so it must not
    // trigger a write (nor bump the aggregate version).
    return currentValue === null || currentValue === undefined
      ? 'noop'
      : 'unset';
  }
  if (Array.isArray(updatedValue)) return 'replace';
  if (currentValue === undefined) return 'set';

  return 'set';
}
