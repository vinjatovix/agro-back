import { DomainStaleVersionException } from '../../domain/errors/index.js';

export function ensureVersion(
  actual: number,
  expected: number,
  entityName: string,
  id: string
): void {
  if (actual === expected) {
    return;
  }

  throw new DomainStaleVersionException(
    `${entityName} version mismatch: ${id}`
  );
}
