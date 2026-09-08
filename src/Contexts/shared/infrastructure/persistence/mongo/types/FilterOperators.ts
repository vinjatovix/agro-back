import type { Primitive } from '../../../../../../shared/domain/types/Primitive.js';

export type FilterOperators<T = Primitive> = {
  eq?: T;

  // string
  contains?: T extends string ? string : never;
  startsWith?: T extends string ? string : never;
  endsWith?: T extends string ? string : never;

  // number
  gt?: T extends number ? number : never;
  gte?: T extends number ? number : never;
  lt?: T extends number ? number : never;
  lte?: T extends number ? number : never;

  // array
  in?: T extends Primitive ? T[] : never;
  includes?: T extends Primitive ? T : never;
  includesSome?: T extends Primitive ? T[] : never;
};
