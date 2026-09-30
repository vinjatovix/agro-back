import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { Plant } from '../../entities/Plant.js';
import type { PlantFilter } from '../../entities/types/PlantFilter.js';
import type { PlantPrimitives } from '../../entities/types/PlantPrimitives.js';

export interface PlantRepository {
  findById(id: string): Promise<Nullable<Plant>>;
  findActiveById(id: string): Promise<Nullable<Plant>>;
  save(plant: Plant): Promise<void>;
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
    current: PlantPrimitives,
    updated: PlantPrimitives
  ): Promise<WriteOutcome>;
  findAll(options?: QueryOptions<PlantFilter>): Promise<PaginatedResult<Plant>>;
  exists(id: string): Promise<boolean>;
}
