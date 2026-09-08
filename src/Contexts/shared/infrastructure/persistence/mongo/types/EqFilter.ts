export type EqFilter<T> = {
  eq: T;
  contains?: never;
  startsWith?: never;
  endsWith?: never;
  in?: never;
  gt?: never;
  gte?: never;
  lt?: never;
  lte?: never;
  includes?: never;
  includesSome?: never;
};
