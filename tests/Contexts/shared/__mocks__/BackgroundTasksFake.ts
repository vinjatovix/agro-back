import type { BackgroundTasks } from '../../../../src/Contexts/shared/application/background/index.js';

/**
 * Records the label of every task and runs it at once. Rejections are kept,
 * never thrown, as the real adapter does; `idle()` waits for every task.
 */
export class BackgroundTasksFake implements BackgroundTasks {
  readonly labels: string[] = [];
  readonly failures: unknown[] = [];
  private readonly started: Array<Promise<void>> = [];

  run(label: string, task: () => Promise<unknown>): void {
    this.labels.push(label);
    this.started.push(
      task().then(
        () => undefined,
        (error: unknown) => {
          this.failures.push(error);
        }
      )
    );
  }

  async idle(): Promise<void> {
    await Promise.all(this.started);
  }
}
