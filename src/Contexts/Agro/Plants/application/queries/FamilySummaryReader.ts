/** The family a plant points to, as embedded with `include=family`. */
export type FamilySummaryView = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

/**
 * What the plant catalog needs to embed families: owned by Plants, satisfied
 * by the family read side, so Plants never imports Families code.
 */
export interface FamilySummaryReader {
  /** One read; unknown or non-UUID ids are simply missing from the result. */
  findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly FamilySummaryView[]>;
}
