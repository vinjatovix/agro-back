import type { ArrayFilterOperators } from './ArrayFilterOperators.js';
import type { EqFilter } from './EqFilter.js';
import type { NumberFilterOperators } from './NumberFilterOperators.js';
import type { StringFilterOperators } from './StringFilterOperators.js';

export type FilterOperators<T> =
  | EqFilter<T>
  | StringFilterOperators
  | NumberFilterOperators
  | ArrayFilterOperators;
