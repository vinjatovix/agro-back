import type { BackgroundTasks } from '../../application/background/index.js';
import { MailDeliveryException } from '../../application/mailer/index.js';
import type { AppLogger } from '../../plugins/index.js';

export type InProcessBackgroundTasksDependencies = {
  logger: AppLogger;
};

/**
 * Runs tasks in this process after the caller moves on, and tracks them so
 * shutdown and tests can wait for them. A failure is logged with its label
 * and reason only, never with what the task carried.
 */
export class InProcessBackgroundTasks implements BackgroundTasks {
  private readonly logger: AppLogger;
  private readonly pending = new Set<Promise<void>>();

  constructor({ logger }: InProcessBackgroundTasksDependencies) {
    this.logger = logger;
  }

  run(label: string, task: () => Promise<unknown>): void {
    const tracked = this.start(task).then(
      () => undefined,
      (error: unknown) => {
        this.logger.warn(`${label} failed: ${this.reasonOf(error)}`);
      }
    );

    this.pending.add(tracked);
    void tracked.finally(() => this.pending.delete(tracked));
  }

  async idle(): Promise<void> {
    // Tasks started while waiting are awaited too.
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }

  /** Async, so a synchronous throw from `task` becomes a rejection too. */
  private async start(task: () => Promise<unknown>): Promise<unknown> {
    return task();
  }

  private reasonOf(error: unknown): string {
    if (error instanceof MailDeliveryException) return error.reason;
    if (error instanceof Error) return error.constructor.name;

    return 'unknown error';
  }
}
