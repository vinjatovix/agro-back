import type { PaginationParams } from './PaginationParams.js';
import type { SortOptions } from './SortOptions.js';

export interface QueryOptions<TFilter = unknown> {
  filter?: TFilter;
  sort?: SortOptions;
  pagination?: PaginationParams;
  include?: string[];
}
