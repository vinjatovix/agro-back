import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { Bed } from '../../entities/Bed.js';
import type { BedFilter } from '../../entities/types/BedFilter.js';
import type { BedPrimitives } from '../../entities/types/BedPrimitives.js';

export interface BedRepository {
  findById(id: string): Promise<Nullable<Bed>>;
  findOwnedActiveById(id: string, userId: string): Promise<Nullable<Bed>>;
  save(bed: Bed): Promise<void>;
  /**
   * Receives two complete states of the same aggregate, both produced by the
   * same domain mapper (`toPrimitives` before and after the mutation method).
   * MUST NOT receive a partial object or patch: a field missing from `updated`
   * is removed (`$unset`). An empty diff writes nothing and does not bump
   * `version`.
   */
  updateWithDiff(
    current: BedPrimitives,
    updated: BedPrimitives,
    user: string
  ): Promise<void>;
  findAll(options?: QueryOptions<BedFilter>): Promise<PaginatedResult<Bed>>;
  exists(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Bed[]>;
}
