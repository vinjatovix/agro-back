import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import { validateBody } from '../../../../src/apps/agroApi/middlewares/validateBody.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

const buildReq = (body: unknown): Request => ({ body }) as unknown as Request;

const buildRes = (): Response => ({}) as unknown as Response;

const captureError = (fn: () => void): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('validateBody middleware', () => {
  it('should call next when the body has at least one key', () => {
    const next = jest.fn() as NextFunction;

    validateBody(buildReq({ name: 'bed' }), buildRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['an empty object', {}],
    ['undefined (no body parser matched)', undefined]
  ])('should reject %s with 400 Bad Request', (_label, body) => {
    const next = jest.fn() as NextFunction;

    const error = captureError(() => {
      validateBody(buildReq(body), buildRes(), next);
    });

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);
    expect(next).not.toHaveBeenCalled();
  });
});
