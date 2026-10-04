import type { PaginationParams } from './PaginationParams.js';
import type { SortOptions } from './SortOptions.js';

export interface QueryOptions<
  TFilter,
  TField extends string = string,
  TRelation extends string = string
> {
  filter?: TFilter;
  sort?: SortOptions;
  pagination?: PaginationParams;
  /** Relations to embed, de-duplicated and in declared order. */
  include?: readonly TRelation[];
  /**
   * Fields of the primary resource to read and send besides `id`. Absent:
   * every field; empty: only `id`.
   */
  fields?: readonly TField[];
}

/** The part of the query options a single read accepts. */
export type ReadOptions<
  TField extends string,
  TRelation extends string = never
> = Pick<QueryOptions<never, TField, TRelation>, 'include' | 'fields'>;
