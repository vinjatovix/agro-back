import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import type { PlantReadView } from './PlantReadView.js';

/**
 * Read port of the plant catalog. Filters, sort keys, collation and paging
 * behave exactly like `PlantRepository.findAll` for the same options.
 */
export interface PlantReadRepository {
  /** Any status, deleted plants included. */
  findById(id: string): Promise<Nullable<PlantReadView>>;
  /** Only a plant that is not deleted. */
  findActiveById(id: string): Promise<Nullable<PlantReadView>>;
  findAll(
    options?: QueryOptions<PlantFilter>
  ): Promise<PaginatedResult<PlantReadView>>;
}
