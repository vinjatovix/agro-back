import type { NextFunction, Request, Response } from 'express';
import { createError } from '../../../shared/errors/index.js';

export type IfMatchParseResult =
  | { kind: 'missing' }
  | { kind: 'malformed'; reason: string }
  | { kind: 'ok'; version: number };

const IF_MATCH_ERROR_KEY = 'if-match';
const STRONG_VERSION_TAG = /^"(0|[1-9]\d*)"$/;

export const parseIfMatch = (
  header: string | undefined
): IfMatchParseResult => {
  const value = header?.trim() ?? '';

  if (value === '' || value === '*') {
    return { kind: 'missing' };
  }

  const match = STRONG_VERSION_TAG.exec(value);
  if (match === null) {
    return {
      kind: 'malformed',
      reason:
        'If-Match must be exactly one strong entity tag holding a non-negative integer version, e.g. "3"'
    };
  }

  const version = Number(match[1]);
  if (!Number.isSafeInteger(version)) {
    return {
      kind: 'malformed',
      reason: 'If-Match version exceeds the maximum supported integer'
    };
  }

  return { kind: 'ok', version };
};

export const requireIfMatch = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = parseIfMatch(req.get('If-Match'));

  switch (result.kind) {
    case 'missing':
      throw createError.preconditionRequired('If-Match header is required');
    case 'malformed':
      throw createError.badRequest('Validation error', {
        [IF_MATCH_ERROR_KEY]: result.reason
      });
    case 'ok':
      res.locals.expectedVersion = result.version;
      next();
  }
};

export const getExpectedVersion = (res: Response): number => {
  const value: unknown = res.locals.expectedVersion;

  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }

  throw createError.internal(
    'expectedVersion missing: requireIfMatch is not registered on this route'
  );
};
