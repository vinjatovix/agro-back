/* eslint-disable @typescript-eslint/require-await */
import type {
  FamilySummaryReader,
  FamilySummaryView
} from '../../../../../src/Contexts/Agro/Plants/application/queries/index.js';

/** In-memory family summaries, keyed by family id. */
export class FamilySummaryReaderMock implements FamilySummaryReader {
  private readonly findSummariesByIdsMock = jest.fn();
  private readonly summaries = new Map<string, FamilySummaryView>();

  async findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly FamilySummaryView[]> {
    this.findSummariesByIdsMock(ids);

    return ids.flatMap((id) => {
      const summary = this.summaries.get(id);

      return summary ? [summary] : [];
    });
  }

  /* ---------- helpers ---------- */

  add(...summaries: FamilySummaryView[]): void {
    for (const summary of summaries) this.summaries.set(summary.id, summary);
  }

  /* ---------- assertions ---------- */

  assertCalledOnceWith(ids: readonly string[]): void {
    expect(this.findSummariesByIdsMock).toHaveBeenCalledTimes(1);
    expect(this.findSummariesByIdsMock).toHaveBeenCalledWith(ids);
  }

  assertNotCalled(): void {
    expect(this.findSummariesByIdsMock).not.toHaveBeenCalled();
  }
}
