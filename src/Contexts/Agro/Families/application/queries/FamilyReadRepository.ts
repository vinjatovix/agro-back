import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import type { FamilyReadView } from './FamilyReadView.js';

/**
 * Read port of the family catalog. Filters, sort keys and paging behave
 * exactly like `FamilyRepository.findAll` for the same options.
 */
export interface FamilyReadRepository {
  findById(id: string): Promise<Nullable<FamilyReadView>>;
  findBySlug(slug: string): Promise<Nullable<FamilyReadView>>;
  findAll(
    options?: QueryOptions<FamilyFilter>
  ): Promise<PaginatedResult<FamilyReadView>>;
}
