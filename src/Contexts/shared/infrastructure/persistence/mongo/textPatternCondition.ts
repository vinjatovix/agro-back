import { escapeRegex } from '../../../../../shared/utils/escapeRegex.js';

export type TextPatternOperator = 'contains' | 'startsWith' | 'endsWith';

export type MongoRegexCondition = { $regex: string; $options: 'i' };

const TEXT_PATTERN_OPERATORS: ReadonlyArray<TextPatternOperator> = [
  'contains',
  'startsWith',
  'endsWith'
];

const ANCHORS: Record<TextPatternOperator, (escaped: string) => string> = {
  contains: (escaped) => escaped,
  startsWith: (escaped) => `^${escaped}`,
  endsWith: (escaped) => `${escaped}$`
};

/**
 * Case-insensitive match of `value` taken literally (pattern characters are
 * escaped), anchored at the start or end for `startsWith`/`endsWith`.
 */
export const textPatternCondition = (
  operator: TextPatternOperator,
  value: string
): MongoRegexCondition => ({
  $regex: ANCHORS[operator](escapeRegex(value)),
  $options: 'i'
});

/** The first text pattern operator present in `condition`, if any. */
export const findTextPatternCondition = (
  condition: Partial<Record<TextPatternOperator, unknown>>
): MongoRegexCondition | undefined => {
  const operator = TEXT_PATTERN_OPERATORS.find(
    (candidate) => condition[candidate] !== undefined
  );

  return operator === undefined
    ? undefined
    : textPatternCondition(operator, String(condition[operator]));
};
