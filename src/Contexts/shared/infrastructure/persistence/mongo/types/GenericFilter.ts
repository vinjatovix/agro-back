import type { FilterOperators } from './FilterOperators.js';

export type GenericFilter<TFields> = {
  [K in keyof TFields]?: FilterOperators<TFields[K]>;
};
