import { assert } from 'chai';

type Operator = (actual: unknown, expected: unknown) => boolean;

// A missing field or a value of the wrong type fails the assertion instead of
// throwing a TypeError.
export const operators = {
  eq: (a, b) => a === b,

  // A single expected value (no comma in the cell) counts as a one-item list.
  hasAny: (a, b) =>
    Array.isArray(a) && (Array.isArray(b) ? b : [b]).some((v) => a.includes(v)),

  contains: (a, b) =>
    typeof a === 'string' && typeof b === 'string' && a.includes(b),

  startsWith: (a, b) =>
    typeof a === 'string' && typeof b === 'string' && a.startsWith(b),

  endsWith: (a, b) =>
    typeof a === 'string' && typeof b === 'string' && a.endsWith(b)
} satisfies Record<string, Operator>;

export type MatchRow = {
  field: string;
  operator: keyof typeof operators;
  value: string;
};

/** Value at a dot path (`a.b.c`), or `undefined` when any segment is missing. */
export const valueAtPath = (obj: unknown, path: string): unknown =>
  path.split('.').reduce((acc, key) => {
    if (typeof acc === 'object' && acc !== null && Object.hasOwn(acc, key)) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj);

// A comma-separated cell is a list; each item is parsed like a single value.
function parseExpected(value: string): unknown {
  if (value.includes(',')) {
    return value.split(',').map((v) => parseScalar(v.trim()));
  }

  return parseScalar(value);
}

function parseScalar(value: string): unknown {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  // `Number('')` and `Number(' ')` are 0: blank cells stay strings.
  if (value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
}

export function assertField(
  item: unknown,
  field: string,
  operator: keyof typeof operators,
  expected: string
): void {
  const actual = valueAtPath(item, field);

  const parsedExpected = parseExpected(expected);

  const fn: Operator | undefined = operators[operator];

  assert.exists(fn, `Operator "${operator}" not supported`);

  const result = fn(actual, parsedExpected);

  assert.isTrue(
    result,
    `Expected field "${field}" with value ${JSON.stringify(actual)} to satisfy ${operator} ${JSON.stringify(parsedExpected)}`
  );
}
