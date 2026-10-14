/** Wall-clock duration of one awaited operation, in milliseconds. */
export async function measureMs(
  operation: () => Promise<unknown>
): Promise<number> {
  const start = process.hrtime.bigint();
  await operation();

  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

/**
 * Median of the samples. Latency checks assert on it, never on a single run,
 * so one slow run on a busy machine does not fail the suite.
 */
export function median(samples: readonly number[]): number {
  if (samples.length === 0) {
    throw new RangeError('median needs at least one sample');
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}
