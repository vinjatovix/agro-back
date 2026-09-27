import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import {
  getExpectedVersion,
  requireIfMatch
} from '../../../../src/apps/agroApi/middlewares/requireIfMatch.js';
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
      expect(res.locals.expectedVersion).toBeUndefined();
    }
  );

  it.each([
    ['W/"3"'],
    ['"3", "4"'],
    ['3'],
    ['"-1"'],
    ['"03"'],
    ['"abc"'],
    ['"1.5"'],
    ['"9007199254740992"']
  ])('should reject %p with 400 and an if-match error key', (header) => {
    const next = jest.fn() as NextFunction;
    const res = buildRes();

    const error = captureError(() =>
      requireIfMatch(buildReq(header), res, next)
    );

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);
    expect((error as HttpError).errors).toHaveProperty('if-match');
    expect(next).not.toHaveBeenCalled();
    expect(res.locals.expectedVersion).toBeUndefined();
  });

  it.each([
    ['"0"', 0],
    ['"3"', 3],
    [' "3" ', 3],
    ['"9007199254740991"', Number.MAX_SAFE_INTEGER]
  ])(
    'should accept %p and store expectedVersion %p',
    (header, expectedVersion) => {
      const next = jest.fn() as NextFunction;
      const res = buildRes();

      requireIfMatch(buildReq(header), res, next);

      expect(res.locals.expectedVersion).toBe(expectedVersion);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    }
  );
});

describe('getExpectedVersion', () => {
  it('should return the version stored by requireIfMatch', () => {
    const res = buildRes();
    requireIfMatch(buildReq('"7"'), res, jest.fn() as NextFunction);

    expect(getExpectedVersion(res)).toBe(7);
  });

  it.each([[undefined], ['3'], [-1], [1.5], [Number.NaN]])(
    'should throw a 500 error when expectedVersion is %p',
    (value) => {
      const res = buildRes({ expectedVersion: value });

      const error = captureError(() => getExpectedVersion(res));

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(
        httpStatus.INTERNAL_SERVER_ERROR
      );
    }
  );
});
