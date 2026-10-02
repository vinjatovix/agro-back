import type { Response } from 'express';
import { z } from 'zod';

import { createError } from '../../../shared/errors/index.js';

// Version tags: the strong entity tag `"<version>"` sent as `ETag`, and the
// `If-Match` list (RFC 9110 §8.8.3, §13.1.1) that names the versions a write
// was based on.

/** At most this many entity tags in one `If-Match`. */
const MAX_IF_MATCH_TAGS = 50;

// entity-tag = [ "W/" ] DQUOTE *etagc DQUOTE
// etagc      = %x21 / %x23-7E / %x80-FF   (a comma is a valid tag character)
const ENTITY_TAG_SOURCE = '(W\\/)?"([\\x21\\x23-\\x7E\\x80-\\xFF]*)"';
const OWS = '[ \\t]*';

// `#entity-tag`: comma-separated with optional whitespace; empty elements are
// tolerated, at least one tag is required. Tags never contain a `"`, so the
// pattern cannot backtrack.
const ENTITY_TAG_LIST = new RegExp(
  `^(?:,${OWS})*${ENTITY_TAG_SOURCE}(?:${OWS},(?:${OWS}${ENTITY_TAG_SOURCE})?)*$`
);

// Tags are taken from the matched list with this pattern, never by splitting
// on commas: `"a,b"` is one tag.
const ENTITY_TAG = new RegExp(ENTITY_TAG_SOURCE, 'g');

const VERSION_VALUE = /^(0|[1-9]\d*)$/;

const EXPECTED_VERSIONS_KEY = 'expectedVersions';

/** The version a strong tag names; weak tags and other values name none. */
const toVersion = ([, weak, value = '']: RegExpExecArray): number[] => {
  if (weak !== undefined || !VERSION_VALUE.test(value)) return [];

  const version = Number(value);

  return Number.isSafeInteger(version) ? [version] : [];
};

/**
 * Parses an `If-Match` list into the versions it names. A well-formed list may
 * name none (`W/"3"`, `"abc"`): the write then fails its precondition once the
 * resource is found.
 */
export const ifMatchSchema = z
  .string()
  .trim()
  .regex(ENTITY_TAG_LIST, {
    message: 'Expected a list of entity tags, e.g. "3" or "2", "3"'
  })
  .transform((value) => [...value.matchAll(ENTITY_TAG)])
  .refine((tags) => tags.length <= MAX_IF_MATCH_TAGS, {
    message: `Too many entity tags: at most ${MAX_IF_MATCH_TAGS}`
  })
  .transform((tags): readonly number[] => tags.flatMap(toVersion));

export const setVersionETag = (res: Response, version: number): void => {
  res.set('ETag', `"${version}"`);
};

export const storeExpectedVersions = (
  res: Response,
  versions: readonly number[]
): void => {
  res.locals[EXPECTED_VERSIONS_KEY] = versions;
};

const isVersionList = (value: unknown): value is readonly number[] =>
  Array.isArray(value) &&
  value.every(
    (version) =>
      typeof version === 'number' &&
      Number.isSafeInteger(version) &&
      version >= 0
  );

/** The versions named by `If-Match`, kept by `requireIfMatch`. */
export const getExpectedVersions = (res: Response): readonly number[] => {
  const value: unknown = res.locals[EXPECTED_VERSIONS_KEY];

  if (isVersionList(value)) return value;

  throw createError.internal(
    'expectedVersions missing: requireIfMatch is not registered on this route'
  );
};
