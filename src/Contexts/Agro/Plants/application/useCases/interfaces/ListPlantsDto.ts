import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { PlantFilter } from '../../../domain/entities/types/PlantFilter.js';
import type { PlantField, PlantRelation } from '../../queries/PlantReadView.js';

export interface ListPlantsDto {
  query?: QueryOptions<PlantFilter, PlantField, PlantRelation>;
}
