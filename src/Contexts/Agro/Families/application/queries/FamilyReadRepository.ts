import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import type {
  FamilyField,
  FamilyReadView,
  FamilySparseView
} from './FamilyReadView.js';

/** A family reduced to what another catalog embeds: id, name and slug. */
export type FamilySummary = Pick<FamilyReadView, 'id' | 'name' | 'slug'>;

/**
 * Read port of the family catalog. Filters, sort keys and paging behave
 * exactly like `FamilyRepository.findAll` for the same options. With
 * `fields`, only `id` and those fields are read and returned; without, every
 * field.
 */
export interface FamilyReadRepository {
  findById(
    id: string,
    options?: ReadOptions<FamilyField>
  ): Promise<Nullable<FamilySparseView>>;
  findBySlug(
    slug: string,
    options?: ReadOptions<FamilyField>
  ): Promise<Nullable<FamilySparseView>>;
  findAll(
    options?: Omit<QueryOptions<FamilyFilter, FamilyField>, 'include'>
  ): Promise<PaginatedResult<FamilySparseView>>;
  /**
   * The summaries of the stored families among `ids`, in one read. Unknown
   * ids, and ids that are not UUIDs, are simply missing from the result.
   */
  findSummariesByIds(ids: readonly string[]): Promise<readonly FamilySummary[]>;
}
