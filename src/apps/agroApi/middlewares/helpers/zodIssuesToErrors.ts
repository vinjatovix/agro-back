import type { z } from 'zod';

export type RequestPart = 'params' | 'query' | 'body';

export type PartIssues = {
  part: RequestPart;
  issues: ReadonlyArray<z.core.$ZodIssue>;
};

type ErrorEntry = {
  path: ReadonlyArray<PropertyKey>;
  message: string;
};

const UNKNOWN_FIELD_MESSAGE = 'Unknown field';
const INVALID_FORMAT_MESSAGE = 'Invalid format';
const MAX_FIELD_ERRORS = 20;
const MAX_ERROR_KEY_LENGTH = 64;
const TRUNCATED_ERROR_KEY = '_truncated';
const TRUNCATED_ERROR_MESSAGE = `Too many validation errors; only the first ${MAX_FIELD_ERRORS} are shown`;
const KEY_ELLIPSIS = '…';

// Zod's native `regex` message prints the schema's internal pattern, so any
// message that contains it is replaced with a fixed one; a custom message
// that does not reveal the pattern is kept as written.
const toMessage = (issue: z.core.$ZodIssue): string =>
  issue.code === 'invalid_format' &&
  issue.format === 'regex' &&
  issue.pattern !== undefined &&
  issue.message.includes(issue.pattern)
    ? INVALID_FORMAT_MESSAGE
    : issue.message;

// Zod's native `unrecognized_keys` message repeats the client's key names, so
// it is split into one fixed-message entry per key instead of being copied.
const toEntries = (issue: z.core.$ZodIssue): ErrorEntry[] =>
  issue.code === 'unrecognized_keys'
    ? issue.keys.map((key) => ({
        path: [...issue.path, key],
        message: UNKNOWN_FIELD_MESSAGE
      }))
    : [{ path: issue.path, message: toMessage(issue) }];

// Counted in code points so a surrogate pair is never split.
const truncateKey = (key: string): string => {
  const codePoints = Array.from(key);

  return codePoints.length > MAX_ERROR_KEY_LENGTH
    ? codePoints.slice(0, MAX_ERROR_KEY_LENGTH - 1).join('') + KEY_ELLIPSIS
    : key;
};

const toKey = (part: RequestPart, path: ReadonlyArray<PropertyKey>): string =>
  truncateKey(path.length === 0 ? part : path.map(String).join('.'));

const flattenEntries = function* (
  parts: ReadonlyArray<PartIssues>
): Generator<{ key: string; message: string }> {
  for (const { part, issues } of parts) {
    for (const entry of issues.flatMap(toEntries)) {
      yield { key: toKey(part, entry.path), message: entry.message };
    }
  }
};

/**
 * Builds the dot-notation `errors` dictionary of a validation `400`.
 * Parts must come in request order (params → query → body); the first
 * message per key wins and at most MAX_FIELD_ERRORS keys are kept.
 */
export const zodIssuesToErrors = (
  parts: ReadonlyArray<PartIssues>
): Record<string, string> => {
  const errors = new Map<string, string>();
  let truncated = false;

  for (const { key, message } of flattenEntries(parts)) {
    if (errors.has(key)) continue;

    // A new key past the limit: the rest cannot change the result.
    if (errors.size >= MAX_FIELD_ERRORS) {
      truncated = true;
      break;
    }

    errors.set(key, message);
  }

  if (truncated) {
    errors.set(TRUNCATED_ERROR_KEY, TRUNCATED_ERROR_MESSAGE);
  }

  return Object.fromEntries(errors);
};
