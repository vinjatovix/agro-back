import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import { requireIfMatch } from '../../../../src/apps/agroApi/middlewares/requireIfMatch.js';
import { getExpectedVersions } from '../../../../src/apps/agroApi/shared/versionTags.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

const buildReq = (ifMatch: string | undefined): Request =>
  ({
    get: jest.fn((name: string) =>
      name.toLowerCase() === 'if-match' ? ifMatch : undefined
    )
  }) as unknown as Request;

const buildRes = (locals: Record<string, unknown> = {}): Response =>
  ({ locals }) as unknown as Response;

const captureError = (fn: () => void): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('requireIfMatch middleware', () => {
  it.each([[undefined], [''], ['   '], ['*'], [' * ']])(
    'should reject %p with 428 Precondition Required',
    (header) => {
      const next = jest.fn() as NextFunction;
      const res = buildRes();

      const error = captureError(() =>
        requireIfMatch(buildReq(header), res, next)
      );

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(
        httpStatus.PRECONDITION_REQUIRED
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.locals.expectedVersions).toBeUndefined();
    }
  );

  it.each([['3'], ['"3'], ['"3" "4"'], ['*, "3"'], ['W/3']])(
    'should reject the malformed %p with 400 and an if-match error key',
    (header) => {
      const next = jest.fn() as NextFunction;
      const res = buildRes();

      const error = captureError(() =>
        requireIfMatch(buildReq(header), res, next)
      );

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);
      expect(Object.keys((error as HttpError).errors ?? {})).toEqual([
        'if-match'
      ]);
      expect(next).not.toHaveBeenCalled();
      expect(res.locals.expectedVersions).toBeUndefined();
    }
  );

  it.each([
    ['"0"', [0]],
    [' "3" ', [3]],
    ['"2", "3"', [2, 3]],
    ['W/"3"', []],
    ['"abc"', []],
    ['"9007199254740991"', [Number.MAX_SAFE_INTEGER]]
  ])(
    'should accept %p and keep the expected versions %j',
    (header, expectedVersions) => {
      const next = jest.fn() as NextFunction;
      const res = buildRes();

      requireIfMatch(buildReq(header), res, next);

      expect(getExpectedVersions(res)).toEqual(expectedVersions);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    }
  );
});
