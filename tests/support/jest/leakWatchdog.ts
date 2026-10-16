import type { GlobalConfig, ProjectConfig } from 'jest';

// Jest loads this file with Node's `require`, which ignores `moduleNameMapper`,
// so it imports no relative module; the grace period comes from
// `testEnvironmentOptions` in `jest.config.ts`.

const DEFAULT_GRACE_PERIOD_MS = 10_000;
const LEAKS_COMMAND = 'npm run test:unit:leaks';

const gracePeriodOf = (options: Record<string, unknown>): number => {
  const value = options['leakGracePeriodMs'];
  return typeof value === 'number' ? value : DEFAULT_GRACE_PERIOD_MS;
};

/**
 * Root `globalTeardown`: when something keeps the Jest main process alive
 * after the run, fail it with a pointer to the diagnostic command instead of
 * hanging. The timer is unref'd, so a clean process exits at once.
 */
export default function leakWatchdog(
  globalConfig: GlobalConfig,
  projectConfig: ProjectConfig
): void {
  if (globalConfig.watch || globalConfig.watchAll) return;

  const gracePeriodMs = gracePeriodOf(projectConfig.testEnvironmentOptions);

  setTimeout(() => {
    process.stderr.write(
      `\nThe test run finished but something is still open ` +
        `${gracePeriodMs / 1000} s later. Run \`${LEAKS_COMMAND}\` to find it.\n`
    );
    process.exit(1);
  }, gracePeriodMs).unref();
}
