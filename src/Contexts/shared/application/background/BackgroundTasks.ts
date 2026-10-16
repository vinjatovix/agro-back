export interface BackgroundTasks {
  /** Starts `task` without waiting. Never throws; a rejection is logged under `label`. */
  run(label: string, task: () => Promise<unknown>): void;
  /** Resolves once every task started so far has settled. */
  idle(): Promise<void>;
}
