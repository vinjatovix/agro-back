export type ArrayFilterOperators<T = unknown> = {
  eq?: never;
  in?: T[];
  has?: T;
  hasAny?: T[];
};
