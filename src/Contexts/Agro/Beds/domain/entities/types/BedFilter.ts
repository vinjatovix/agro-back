import { type ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';

export interface BedFilter {
  depth?: ExactFilter<number>;
  height?: ExactFilter<number>;
  width?: ExactFilter<number>;
}
