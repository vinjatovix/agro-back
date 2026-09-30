import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { Family } from '../../entities/Family.js';
import type { FamilyFilter } from '../../types/FamilyFilter.js';
import type { FamilyPrimitives } from '../../types/FamilyPrimitives.js';

export interface FamilyRepository {
  findById(id: string): Promise<Nullable<Family>>;
  findBySlug(slug: string): Promise<Nullable<Family>>;
  save(family: Family): Promise<void>;
  /**
   * Receives two complete states of the same aggregate, both produced by the
   * same domain mapper (`toPrimitives` before and after the mutation method).
   * MUST NOT receive a partial object or patch: a field missing from `updated`
   * is removed (`$unset`). Never adds audit metadata; only `version` is
   * advanced by storage. An empty diff writes nothing but is confirmed with
   * the same active + version check as a write.
   *
   * Returns `written` (version advanced by one) or `unchanged` (confirmed
   * no-op), never a version number.
   */
  updateWithDiff(
    current: FamilyPrimitives,
    updated: FamilyPrimitives
  ): Promise<WriteOutcome>;
  findAll(
    options?: QueryOptions<FamilyFilter>
  ): Promise<PaginatedResult<Family>>;
  exists(id: string): Promise<boolean>;
}
