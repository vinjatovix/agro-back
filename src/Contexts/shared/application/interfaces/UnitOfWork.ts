/**
 * Groups repository writes so they are applied all together or not at all.
 * Use cases do every read and rule check before `run` and only write inside
 * `work`, one write at a time.
 */
export interface UnitOfWork {
  /**
   * Runs `work` so that every repository write it makes is applied all
   * together or not at all. `work` may run more than once (retries), so it
   * must only issue writes and must not depend on side effects of a previous
   * attempt. Errors thrown by `work` abort the unit and are rethrown.
   */
  run<T>(work: () => Promise<T>): Promise<T>;
}
