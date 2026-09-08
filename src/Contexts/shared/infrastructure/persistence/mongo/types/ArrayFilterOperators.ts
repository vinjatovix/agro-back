export type ArrayFilterOperators<T = unknown> = {
  eq?: never;
  in?: T[];
  includes?: T;
  includesSome?: T[];
};
