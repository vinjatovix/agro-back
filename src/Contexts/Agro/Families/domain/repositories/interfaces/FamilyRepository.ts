import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
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
   * is removed (`$unset`). An empty diff writes nothing and does not bump
   * `version`.
   */
  updateWithDiff(
    current: FamilyPrimitives,
    updated: FamilyPrimitives,
    user: string
  ): Promise<void>;
  findAll(
    options?: QueryOptions<FamilyFilter>
  ): Promise<PaginatedResult<Family>>;
  exists(id: string): Promise<boolean>;
}
