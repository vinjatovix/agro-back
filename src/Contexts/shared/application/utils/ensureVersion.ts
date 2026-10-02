import { DomainStaleVersionException } from '../../domain/errors/index.js';

/**
 * Passes when `expectedVersions` (the versions named by the client) contains
 * the current one; an empty list never passes.
 */
export function ensureVersion(
  actual: number,
  expectedVersions: readonly number[],
  entityName: string,
  id: string
): void {
  if (expectedVersions.includes(actual)) {
    return;
  }

  throw new DomainStaleVersionException(
    `${entityName} version mismatch: ${id}`
  );
}
