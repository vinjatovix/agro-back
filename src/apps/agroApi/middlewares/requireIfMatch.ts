import type { NextFunction, Request, Response } from 'express';

import { createError } from '../../../shared/errors/index.js';
import { ifMatchSchema, storeExpectedVersions } from '../shared/versionTags.js';

const IF_MATCH_ERROR_KEY = 'if-match';
const VALIDATION_ERROR_MESSAGE = 'Validation error';
const INVALID_IF_MATCH_MESSAGE = 'Invalid If-Match header';

/**
 * Versioned writes need `If-Match`: missing, empty or `*` → `428`; a value
 * outside the entity-tag list grammar → `400`. The versions it names are kept
 * for `getExpectedVersions`; whether they match is decided by the use case.
 */
export const requireIfMatch = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const header = req.get('If-Match')?.trim() ?? '';

  if (header === '' || header === '*') {
    throw createError.preconditionRequired('If-Match header is required');
  }

  const parsed = ifMatchSchema.safeParse(header);
  if (!parsed.success) {
    throw createError.badRequest(VALIDATION_ERROR_MESSAGE, {
      [IF_MATCH_ERROR_KEY]:
        parsed.error.issues[0]?.message ?? INVALID_IF_MATCH_MESSAGE
    });
  }

  storeExpectedVersions(res, parsed.data);
  next();
};
