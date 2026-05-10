import { createError } from '../../../../shared/errors/index.js';
import type { PaginationParams } from '../../../../shared/domain/query/interfaces/PaginationParams.js';

export function normalizePagination(
  pagination?: PaginationParams
): PaginationParams | undefined {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 20;

  if (limit <= 0) {
    throw createError.badRequest('pagination.limit must be greater than 0');
  }

  if (page <= 0) {
    throw createError.badRequest('pagination.page must be greater than 0');
  }

  return { page, limit };
}
