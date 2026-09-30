import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
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
   * is removed (`$unset`). Never adds audit metadata; only `version` is
   * advanced by storage. An empty diff writes nothing but is confirmed with
   * the same active + version check as a write.
   *
   * Returns `written` (version advanced by one) or `unchanged` (confirmed
   * no-op), never a version number.
   */
  updateWithDiff(
    current: BedPrimitives,
    updated: BedPrimitives
  ): Promise<WriteOutcome>;
  findAll(options?: QueryOptions<BedFilter>): Promise<PaginatedResult<Bed>>;
  exists(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Bed[]>;
}
