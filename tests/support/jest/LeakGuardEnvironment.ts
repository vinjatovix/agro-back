import { relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { TestEnvironment } from 'jest-environment-node';

// Jest loads this file with Node's `require`, which ignores `moduleNameMapper`,
// so it imports no relative module; the grace period comes from
// `testEnvironmentOptions` in `jest.config.ts`.

type ResourceCounts = Map<string, number>;

type EnvironmentArgs = ConstructorParameters<typeof TestEnvironment>;

/**
 * Resource types that are not leaks even when their count grows during a
 * file. Every entry needs a comment explaining why.
 */
const IGNORED_RESOURCE_TYPES: ReadonlySet<string> = new Set<string>([]);

const DEFAULT_GRACE_PERIOD_MS = 10_000;
const RECHECK_INTERVAL_MS = 100;
const LEAKS_COMMAND = 'npm run test:unit:leaks';

const gracePeriodOf = (options: Record<string, unknown>): number => {
  const value = options['leakGracePeriodMs'];
  return typeof value === 'number' ? value : DEFAULT_GRACE_PERIOD_MS;
};

const countByType = (): ResourceCounts => {
  const counts: ResourceCounts = new Map();

  for (const type of process.getActiveResourcesInfo()) {
    if (IGNORED_RESOURCE_TYPES.has(type)) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return counts;
};

/**
 * A piped stdio stream opens its handle on first access and keeps it, so a
 * file that is the first to write to it would read as a leak. Reading the
 * getters opens both before the baseline is taken.
 */
const openStdioHandles = (): readonly NodeJS.WriteStream[] => [
  process.stdout,
  process.stderr
];

const excessResources = (baseline: ResourceCounts): ResourceCounts => {
  const excess: ResourceCounts = new Map();

  for (const [type, count] of countByType()) {
    const extra = count - (baseline.get(type) ?? 0);
    if (extra > 0) excess.set(type, extra);
  }

  return excess;
};

const waitForRelease = async (
  baseline: ResourceCounts,
  gracePeriodMs: number
): Promise<ResourceCounts> => {
  const deadline = Date.now() + gracePeriodMs;
  let excess = excessResources(baseline);

  while (excess.size > 0 && Date.now() < deadline) {
    await sleep(RECHECK_INTERVAL_MS); // NOSONAR: polling, each check must wait for the previous one
    excess = excessResources(baseline);
  }

  return excess;
};

const formatLeakMessage = (
  testFile: string,
  excess: ResourceCounts,
  gracePeriodMs: number
): string => {
  const resources = [...excess]
    .map(([type, extra]) => `${type} (+${extra})`)
    .join(', ');

  return (
    `${testFile} left resources open ${gracePeriodMs / 1000} s after its ` +
    `last hook: ${resources}. Run \`${LEAKS_COMMAND}\` to see where they ` +
    'were opened.'
  );
};

/**
 * Node test environment that fails a test file when it ends with more active
 * resources (timers, sockets, servers…) than it started with. It compares
 * counts per type, so a file that closes one socket and leaves another open
 * goes unnoticed. Off in watch mode, where the process is meant to stay alive.
 */
export default class LeakGuardEnvironment extends TestEnvironment {
  private readonly testFile: string;

  private readonly enabled: boolean;

  private readonly gracePeriodMs: number;

  private baseline: ResourceCounts = new Map();

  constructor(...[config, context]: EnvironmentArgs) {
    super(config, context);
    const { globalConfig, projectConfig } = config;
    this.testFile = relative(projectConfig.rootDir, context.testPath);
    this.enabled = !(globalConfig.watch || globalConfig.watchAll);
    this.gracePeriodMs = gracePeriodOf(projectConfig.testEnvironmentOptions);
  }

  override async setup(): Promise<void> {
    await super.setup();
    openStdioHandles();
    this.baseline = countByType();
  }

  override async teardown(): Promise<void> {
    const excess = this.enabled
      ? await waitForRelease(this.baseline, this.gracePeriodMs)
      : new Map<string, number>();

    await super.teardown();

    if (excess.size > 0) {
      throw new TypeError(
        formatLeakMessage(this.testFile, excess, this.gracePeriodMs)
      );
    }
  }
}
