/**
 * What a conditional write did to a stored aggregate: `written` (storage
 * advanced `version` by exactly one) or `unchanged` (empty diff confirmed,
 * nothing written). Storage reports what happened, never a version number, so
 * the aggregate cannot be handed a version it could not have reached.
 */
export type WriteOutcome = 'written' | 'unchanged';

export function versionAfter(version: number, outcome: WriteOutcome): number {
  return outcome === 'written' ? version + 1 : version;
}
