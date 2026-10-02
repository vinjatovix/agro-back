export interface ExactFilter<T> {
  eq?: T;
  /** Matches any of the values (`MongoQueryTranslator` maps it to `$in`). */
  in?: T[];
}
