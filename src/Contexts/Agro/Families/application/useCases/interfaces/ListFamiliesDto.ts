import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { FamilyFilter } from '../../../domain/types/FamilyFilter.js';

export interface ListFamiliesDto {
  query?: QueryOptions<FamilyFilter>;
}
