import type { Plant } from '../../entities/Plant.js';
import type { PlantPrimitives } from '../../entities/types/PlantPrimitives.js';
import type { PlantFilter } from '../../entities/types/PlantFilter.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  updateWithDiff(
    current: PlantPrimitives,
    updated: PlantPrimitives,
    user: string
  ): Promise<void>;
  findAll(options?: QueryOptions<PlantFilter>): Promise<Plant[]>;
  exists(id: string): Promise<boolean>;
}
