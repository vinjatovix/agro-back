import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { FamilyFilter } from '../../../domain/types/FamilyFilter.js';
import type { FamilyField } from '../../queries/FamilyReadView.js';

export interface ListFamiliesDto {
  query?: Omit<QueryOptions<FamilyFilter, FamilyField>, 'include'>;
}
