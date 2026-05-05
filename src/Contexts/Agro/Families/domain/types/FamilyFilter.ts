import type { ArrayFilter } from '../../../../shared/domain/query/interfaces/ArrayFilter.js';
import type { ExactFilter } from '../../../../shared/domain/query/interfaces/ExactFilter.js';
import type { StringFilter } from '../../../../shared/domain/query/interfaces/StringFilter.js';

export interface FamilyFilter {
  id?: ExactFilter<string>;
  slug?: StringFilter;
  name?: StringFilter;
  scientificName?: StringFilter;
  aliases?: ArrayFilter<string>;
}
