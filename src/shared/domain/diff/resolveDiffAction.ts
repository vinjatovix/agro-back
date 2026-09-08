import type { DiffAction } from './DiffAction.js';

export function resolveDiffAction(
  currentValue: unknown,
  updatedValue: unknown
): DiffAction {
  if (updatedValue === undefined) return 'noop';
  if (updatedValue === null) return 'unset';
  if (Array.isArray(updatedValue)) return 'replace';
  if (currentValue === undefined) return 'set';

  return 'set';
}
