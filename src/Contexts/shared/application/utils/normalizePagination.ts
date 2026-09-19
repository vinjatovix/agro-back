import { InvalidArgumentException } from '../../domain/errors/index.js';
import type { PaginationParams } from '../../../../shared/domain/query/interfaces/PaginationParams.js';

export function normalizePagination(
  pagination?: PaginationParams
): PaginationParams | undefined {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 20;

  if (limit <= 0) {
    throw new InvalidArgumentException(
      'pagination.limit must be greater than 0'
    );
  }

  if (page <= 0) {
    throw new InvalidArgumentException(
      'pagination.page must be greater than 0'
    );
  }

  return { page, limit };
}
