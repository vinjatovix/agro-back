import { type QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { type PlantFilter } from '../../../domain/entities/types/PlantFilter.js';

export interface ListPlantsDto {
  query?: QueryOptions<PlantFilter>;
}
