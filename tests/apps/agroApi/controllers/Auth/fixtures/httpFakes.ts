import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import {
  validateRequest,
  type RequestSchemas
} from '../../../../../../src/apps/agroApi/middlewares/validateRequest.js';

type RequestParts = {
  params?: unknown;
  query?: unknown;
  body?: unknown;
};

export type FakeResponse = {
  res: Response;
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

export const buildRequest = ({
  params = {},
  query = {},
  body
}: RequestParts = {}): Request =>
  ({ params, query, body }) as unknown as Request;

export const buildResponse = (
  locals: Record<string, unknown> = {}
): FakeResponse => {
  const status = jest.fn();
  const json = jest.fn();
  const send = jest.fn();
  const res = { locals, status, json, send } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  send.mockReturnValue(res);

  return { res, status, json, send };
};

export const buildNext = (): jest.Mock => jest.fn();

/**
 * Runs the real validation step on `req`/`res` and returns the error it
 * rejects with, or `undefined` when the request is valid.
 */
export const runWithValidation = async (
  schemas: RequestSchemas,
  req: Request,
  res: Response
): Promise<unknown> => {
  try {
    await validateRequest(schemas)(req, res, buildNext() as NextFunction);
  } catch (error) {
    return error;
  }

  return undefined;
};

/** The controller forwarded an internal error (answered as `500`). */
export const expectInternalErrorPassedTo = (next: jest.Mock): void => {
  expect(next).toHaveBeenCalledWith(
    expect.objectContaining({ statusCode: httpStatus.INTERNAL_SERVER_ERROR })
  );
};
