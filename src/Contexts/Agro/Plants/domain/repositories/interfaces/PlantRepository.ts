import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
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
   * is removed (`$unset`). An empty diff writes nothing and does not bump
   * `version`.
   */
  updateWithDiff(
    current: PlantPrimitives,
    updated: PlantPrimitives,
    user: string
  ): Promise<void>;
  findAll(options?: QueryOptions<PlantFilter>): Promise<PaginatedResult<Plant>>;
  exists(id: string): Promise<boolean>;
}
