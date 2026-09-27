import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import { DomainNotFoundException } from '../../domain/errors/index.js';

export function ensureFound<T>(
  value: Nullable<T>,
  entityName: string,
  key: string,
  keyName?: string
): T {
  if (value !== null) {
    return value;
  }

  throw new DomainNotFoundException(
    keyName
      ? `${entityName} not found with ${keyName}: ${key}`
      : `${entityName} not found: ${key}`
  );
}
