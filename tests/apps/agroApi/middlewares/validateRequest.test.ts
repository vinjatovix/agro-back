import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import {
  getValidatedRequest,
  validateRequest,
  type RequestSchemas
} from '../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

import {
  DEFAULT_PAGE,
  sampleBodySchema,
  sampleParamsSchema,
  sampleQuerySchema,
  sampleRequestSchemas,
  sampleValidBody,
  sampleValidParams,
  sampleValidQuery
} from './fixtures/sampleRequestSchemas.js';
import {
  withCatchSchema,
  withIntersectionSchema
} from './fixtures/strictifySchemas.js';
import {
  UNKNOWN_FIELD_MESSAGE,
  VALIDATION_ERROR_MESSAGE
} from './fixtures/validationErrorContract.js';

type RequestParts = {
  params?: unknown;
  query?: unknown;
  body?: unknown;
};

const buildReq = ({ params = {}, query = {}, body }: RequestParts): Request =>
  ({ params, query, body }) as unknown as Request;

const buildRes = (locals: Record<string, unknown> = {}): Response =>
  ({ locals }) as unknown as Response;

const validRequestParts = (): RequestParts => ({
  params: sampleValidParams(),
  query: sampleValidQuery(),
  body: sampleValidBody()
});

const run = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<{ next: jest.Mock; res: Response; req: Request }> => {
  const next = jest.fn();
  const req = buildReq(parts);
  const res = buildRes();

  await validateRequest(schemas)(req, res, next as NextFunction);

  return { next, res, req };
};

const captureRejection = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<{ error: unknown; next: jest.Mock }> => {
  const next = jest.fn();

  try {
    await validateRequest(schemas)(
      buildReq(parts),
      buildRes(),
      next as NextFunction
    );
  } catch (error) {
    return { error, next };
  }

  return { error: undefined, next };
};

const errorsOf = (error: unknown): Record<string, string> => {
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);
  expect((error as HttpError).message).toBe(VALIDATION_ERROR_MESSAGE);

  return (error as HttpError).errors ?? {};
};

const captureError = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

const expectInternalError = (fn: () => unknown): void => {
  const error = captureError(fn);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(
    httpStatus.INTERNAL_SERVER_ERROR
  );
};

describe('validateRequest middleware', () => {
  describe('invalid requests', () => {
    it('should reject an invalid nested body field', async () => {
      const { error, next } = await captureRejection(sampleRequestSchemas(), {
        ...validRequestParts(),
        body: { ...sampleValidBody(), identity: { name: {} } }
      });

      expect(errorsOf(error)).toHaveProperty(['identity.name.primary']);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject an invalid path param', async () => {
      const { error } = await captureRejection(sampleRequestSchemas(), {
        ...validRequestParts(),
        params: { id: 'abc' }
      });

      expect(Object.keys(errorsOf(error))).toEqual(['id']);
    });

    it('should report array items by index', async () => {
      const { error } = await captureRejection(sampleRequestSchemas(), {
        ...validRequestParts(),
        body: { ...sampleValidBody(), tags: ['ok', 42] }
      });

      expect(errorsOf(error)).toHaveProperty(['tags.1']);
    });

    it('should report every failing part in one error', async () => {
      const { error } = await captureRejection(sampleRequestSchemas(), {
        params: { id: 'abc' },
        query: { limit: 'many' },
        body: { ...sampleValidBody(), password: 'abc' }
      });

      expect(Object.keys(errorsOf(error))).toEqual(
        expect.arrayContaining(['id', 'limit', 'password'])
      );
    });

    it('should reject unknown body fields at any depth of a non-strict schema', async () => {
      const body = sampleValidBody();
      const { error } = await captureRejection(sampleRequestSchemas(), {
        ...validRequestParts(),
        body: { ...body, foo: 1, identity: { ...body.identity, foo: 2 } }
      });

      expect(errorsOf(error)).toEqual({
        foo: UNKNOWN_FIELD_MESSAGE,
        'identity.foo': UNKNOWN_FIELD_MESSAGE
      });
    });

    it('should reject unknown query fields when the route validates query', async () => {
      const { error } = await captureRejection(sampleRequestSchemas(), {
        ...validRequestParts(),
        query: { limt: '10' }
      });

      expect(errorsOf(error)).toEqual({ limt: UNKNOWN_FIELD_MESSAGE });
    });

    it('should report a missing body under the body key', async () => {
      const { error } = await captureRejection(
        { body: sampleBodySchema() },
        {}
      );

      expect(Object.keys(errorsOf(error))).toEqual(['body']);
    });

    it('should let a non-Zod error thrown by a schema through unchanged', async () => {
      const failure = new Error('refinement crashed');
      const { error, next } = await captureRejection(
        {
          body: sampleBodySchema().refine(() => {
            throw failure;
          })
        },
        validRequestParts()
      );

      expect(error).toBe(failure);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('route registration', () => {
    it('should ignore query fields when the route declares no query schema', async () => {
      const { next } = await run(
        { params: sampleParamsSchema() },
        { params: sampleValidParams(), query: { foo: '1' } }
      );

      expect(next).toHaveBeenCalledWith();
    });

    it.each([
      ['body', { body: withCatchSchema() }],
      ['query', { query: withIntersectionSchema() }]
    ])(
      'should throw when the %s schema cannot be made strict',
      (_part, schemas) => {
        expectInternalError(() => validateRequest(schemas));
      }
    );

    it('should throw when no request part is declared', () => {
      expectInternalError(() => validateRequest({}));
    });

    it('should accept a params schema that uses catch', () => {
      expect(() =>
        validateRequest({ params: withCatchSchema() })
      ).not.toThrow();
    });
  });

  describe('valid requests', () => {
    it('should store only the declared parts and call next', async () => {
      const body = sampleValidBody();
      const schemas = { body: sampleBodySchema() } satisfies RequestSchemas;
      const { next, res } = await run(schemas, {
        ...validRequestParts(),
        body
      });

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(getValidatedRequest(res, schemas)).toEqual({ body });
    });

    it('should leave req.params, req.query and req.body untouched', async () => {
      const parts = validRequestParts();
      const snapshot = structuredClone(parts);

      const { req } = await run(sampleRequestSchemas(), parts);

      expect(req.params).toBe(parts.params);
      expect(req.query).toBe(parts.query);
      expect(req.body).toBe(parts.body);
      expect({
        params: req.params,
        query: req.query,
        body: req.body as unknown
      }).toEqual(snapshot);
    });

    it('should store coerced query values and defaults', async () => {
      const schemas = { query: sampleQuerySchema() } satisfies RequestSchemas;
      const { req, res } = await run(schemas, { query: { limit: '10' } });

      expect(getValidatedRequest(res, schemas)).toEqual({
        query: { limit: 10, page: DEFAULT_PAGE }
      });
      expect((req.query as Record<string, unknown>).limit).toBe('10');
    });
  });
});

describe('getValidatedRequest', () => {
  it('should return the data stored by validateRequest', async () => {
    const schemas = { query: sampleQuerySchema() } satisfies RequestSchemas;
    const { res } = await run(schemas, { query: { limit: '5' } });

    const { query } = getValidatedRequest(res, schemas);

    expect(query.limit).toBe(5);
    expect(query.page).toBe(DEFAULT_PAGE);
  });

  it.each([
    ['no locals', {}],
    ['locals set by other code', { validated: { query: { limit: 5 } } }]
  ])(
    'should throw a 500 error when validateRequest did not run (%s)',
    (_case, locals) => {
      expectInternalError(() =>
        getValidatedRequest(buildRes(locals), { query: sampleQuerySchema() })
      );
    }
  );

  it('should not read data placed in res.locals by other code', async () => {
    const schemas = { query: sampleQuerySchema() } satisfies RequestSchemas;
    const { res } = await run(schemas, { query: { limit: '5' } });

    res.locals.validated = { query: { limit: 'forged' } };

    expect(getValidatedRequest(res, schemas).query.limit).toBe(5);
  });

  it('should throw a 500 error when a declared part was not validated', async () => {
    const params = sampleParamsSchema();
    const { res } = await run({ params }, { params: sampleValidParams() });

    expectInternalError(() =>
      getValidatedRequest(res, { params, body: sampleBodySchema() })
    );
  });

  it('should throw a 500 error when a part was validated with another schema', async () => {
    const { res } = await run(
      { params: sampleParamsSchema() },
      { params: sampleValidParams() }
    );

    expectInternalError(() =>
      getValidatedRequest(res, { params: sampleParamsSchema() })
    );
  });

  it('should read the parts of chained steps with their own schemas', async () => {
    const parts = validRequestParts();
    const req = buildReq(parts);
    const res = buildRes();
    const next = jest.fn();
    const schemas = {
      params: sampleParamsSchema(),
      body: sampleBodySchema()
    } satisfies RequestSchemas;

    await validateRequest({ params: schemas.params })(
      req,
      res,
      next as NextFunction
    );
    await validateRequest({ body: schemas.body })(
      req,
      res,
      next as NextFunction
    );

    expect(getValidatedRequest(res, schemas)).toEqual({
      params: parts.params,
      body: parts.body
    });
  });
});
