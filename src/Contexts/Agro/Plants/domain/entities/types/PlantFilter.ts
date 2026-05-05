import type { ArrayFilter } from '../../../../../shared/domain/query/interfaces/ArrayFilter.js';
import type { ExactFilter } from '../../../../../shared/domain/query/interfaces/ExactFilter.js';
import type { RangeFilter } from '../../../../../shared/domain/query/interfaces/RangeFilter.js';
import type { StringFilter } from '../../../../../shared/domain/query/interfaces/StringFilter.js';
import type { PlantLifecycleValue } from './PlantLifecycleValue.js';

export interface PlantFilter {
  id?: ExactFilter<string | string[]>;
  aliases?: ArrayFilter<string | string[]>;
  familyId?: ExactFilter<string | string[]>;
  lifeCycle?: ExactFilter<PlantLifecycleValue>;
  spacingCm?: RangeFilter;
  sowingMonths?: ArrayFilter<number>;
  sowingMethod?: ExactFilter<'direct' | 'starter'>;
  soilPh?: RangeFilter;
  soilAvailableDepthCm?: RangeFilter;
  lightHoursMin?: RangeFilter;
  lightType?: ExactFilter<string>;
  strategicBenefits?: StringFilter;
  rootSystem?: ExactFilter<string>;
}
