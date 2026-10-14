import type { UnitOfWork } from '../../../../src/Contexts/shared/application/interfaces/index.js';

export type TracedCall = {
  name: string;
  insideUnit: boolean;
  /** `runCount` when the call happened: same value, same unit. */
  unit: number;
};

/**
 * In-memory unit of work: runs `work` once and records whether a write
 * happened inside a unit. It does not roll anything back; rollback is proven
 * by the integration tests against MongoDB.
 */
export class UnitOfWorkMock implements UnitOfWork {
  runCount = 0;
  readonly tracedCalls: TracedCall[] = [];
  private depth = 0;

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.runCount += 1;
    this.depth += 1;

    try {
      return await work();
    } finally {
      this.depth -= 1;
    }
  }

  isInsideUnit(): boolean {
    return this.depth > 0;
  }

  /**
   * Wraps `fn` so every call is recorded in `tracedCalls` with whether it
   * ran inside a unit. Use it as a spy implementation on repository writes.
   */
  trace<A extends unknown[], R>(
    name: string,
    fn: (...args: A) => Promise<R>
  ): (...args: A) => Promise<R> {
    return (...args: A): Promise<R> => {
      this.tracedCalls.push({
        name,
        insideUnit: this.isInsideUnit(),
        unit: this.runCount
      });

      return fn(...args);
    };
  }
}
