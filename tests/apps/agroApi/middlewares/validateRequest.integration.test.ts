import { readFileSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import httpStatus from 'http-status';
import { load } from 'js-yaml';
import { assertResponseMatchesOpenApi } from 'pure-openapi-assert';
import request from 'supertest';

import { errorHandler } from '../../../../src/apps/agroApi/middlewares/errorHandler.js';
import {
  getValidatedRequest,
  validateRequest,
  type RequestSchemas
} from '../../../../src/apps/agroApi/middlewares/validateRequest.js';
import type { AppLogger } from '../../../../src/Contexts/shared/plugins/index.js';

import {
  DEFAULT_PAGE,
  fieldNames,
  objectWithKeys,
  sampleBodySchema,
  sampleRequestSchemas,
  sampleValidBody,
  sampleValidParams
} from './fixtures/sampleRequestSchemas.js';
import {
  KEY_ELLIPSIS,
  MAX_ERROR_KEY_LENGTH,
  MAX_FIELD_ERRORS,
  TRUNCATED_ERROR_KEY,
  UNKNOWN_FIELD_MESSAGE,
  VALIDATION_ERROR_MESSAGE
} from './fixtures/validationErrorContract.js';

class MockAppLogger implements AppLogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

// Enough to catch non-determinism without nearing Jest's 5s test timeout.
const REPEATED_CALLS = 20;

type ErrorBody = { message: string; errors?: Record<string, string> };

// `assertResponseMatchesOpenApi` only checks against an operation, so any one
// whose 400 is the shared ValidationError response proves the envelope shape.
// A guard test below fails first, with a clear reason, if that stops holding.
const CONTRACT_OPERATION = { path: '/api/v1/auth/register', method: 'POST' };
const VALIDATION_ERROR_REF = '#/components/responses/ValidationError';

type OpenApiPaths = {
  paths?: Record<
    string,
    Record<string, { responses?: Record<string, { $ref?: string }> }>
  >;
};

const openApiSpecPath = (): string =>
  path.resolve(process.cwd(), 'src/apps/agroApi/openapi/openapi.yaml');

const contractOperationBadRequestRef = (): string | undefined => {
  const spec = load(readFileSync(openApiSpecPath(), 'utf8')) as OpenApiPaths;

  return spec.paths?.[CONTRACT_OPERATION.path]?.[
    CONTRACT_OPERATION.method.toLowerCase()
  ]?.responses?.['400']?.$ref;
};

const buildApp = (schemas: RequestSchemas): Express => {
  const app = express();
  app.use(express.json());
  app.post('/samples/:id', validateRequest(schemas), (_req, res) => {
    res.status(httpStatus.OK).json(getValidatedRequest(res, schemas));
  });
  app.use(errorHandler({ logger: new MockAppLogger() }));

  return app;
};

const samplePath = (id: string = sampleValidParams().id): string =>
  `/samples/${encodeURIComponent(id)}`;

const post = (
  app: Express,
  {
    id,
    query = {},
    body = sampleValidBody()
  }: {
    id?: string;
    query?: Record<string, string>;
    body?: object;
  } = {}
): request.Test => request(app).post(samplePath(id)).query(query).send(body);

const expectValidationError = async (
  response: request.Response
): Promise<Record<string, string>> => {
  const body = response.body as ErrorBody;

  expect(response.status).toBe(httpStatus.BAD_REQUEST);
  expect(body.message).toBe(VALIDATION_ERROR_MESSAGE);

  await assertResponseMatchesOpenApi({
    specPath: openApiSpecPath(),
    ...CONTRACT_OPERATION,
    status: response.status,
    body: response.body,
    headers: { 'content-type': String(response.headers['content-type']) }
  });

  return body.errors ?? {};
};

describe('validateRequest over HTTP', () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp(sampleRequestSchemas());
  });

  it('should check responses against an operation whose 400 is the shared ValidationError', () => {
    expect(contractOperationBadRequestRef()).toBe(VALIDATION_ERROR_REF);
  });

  describe('error dictionary', () => {
    it('should answer the contract example with dot-notation keys', async () => {
      const response = await post(app, {
        id: 'abc',
        query: { limt: '10' },
        body: { identity: { foo: 1 }, tags: ['a', 2], password: 'abc' }
      });

      const errors = await expectValidationError(response);

      expect(Object.keys(errors)).toEqual(
        expect.arrayContaining([
          'id',
          'limt',
          'identity.name',
          'identity.foo',
          'tags.1',
          'password'
        ])
      );
      expect(errors.limt).toBe(UNKNOWN_FIELD_MESSAGE);
      expect(errors['identity.foo']).toBe(UNKNOWN_FIELD_MESSAGE);
    });

    it('should answer 500 with the generic message when a schema crashes', async () => {
      const crashing = buildApp({
        body: sampleBodySchema().refine(() => {
          throw new Error('schema bug');
        })
      });

      const response = await post(crashing);

      expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
      expect((response.body as ErrorBody).errors).toBeUndefined();
    });
  });

  describe('no leaked data', () => {
    it('should not echo a rejected password', async () => {
      const password = 'abc';
      const response = await post(app, {
        body: { ...sampleValidBody(), password }
      });

      const errors = await expectValidationError(response);

      expect(errors).toHaveProperty(['password']);
      expect(JSON.stringify(response.body)).not.toContain(password);
    });

    it('should not echo invalid ordinary values', async () => {
      const idSentinel = 'not-a-uuid-sentinel';
      const tagSentinel = 12345678;
      const response = await post(app, {
        id: idSentinel,
        body: { ...sampleValidBody(), tags: ['ok', tagSentinel] }
      });

      await expectValidationError(response);

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toContain(idSentinel);
      expect(serialised).not.toContain(String(tagSentinel));
    });

    it('should bound the body when 1,000 unknown keys are sent', async () => {
      const response = await post(app, {
        body: { ...sampleValidBody(), ...objectWithKeys(fieldNames(1000)) }
      });

      const errors = await expectValidationError(response);

      expect(Object.keys(errors).length).toBeLessThanOrEqual(
        MAX_FIELD_ERRORS + 1
      );
      expect(errors).toHaveProperty([TRUNCATED_ERROR_KEY]);
    });

    it('should cut a 10,000-character unknown key', async () => {
      const longKey = 'x'.repeat(10_000);
      const response = await post(app, {
        body: { ...sampleValidBody(), [longKey]: 1 }
      });

      const errors = await expectValidationError(response);
      const keys = Object.keys(errors);

      expect(keys).toHaveLength(1);
      expect(Array.from(keys[0] ?? '')).toHaveLength(MAX_ERROR_KEY_LENGTH);
      expect(keys[0]?.endsWith(KEY_ELLIPSIS)).toBe(true);
      expect(JSON.stringify(response.body)).not.toContain(longKey);
    });

    it('should answer the same invalid request identically on repeated calls', async () => {
      const invalid = {
        id: 'abc',
        query: { limt: '1' },
        body: { ...objectWithKeys(fieldNames(30)), tags: [1] }
      };

      const bodies = new Set<string>();
      for (let run = 0; run < REPEATED_CALLS; run++) {
        const response = await post(app, invalid);
        bodies.add(JSON.stringify(response.body));
      }

      expect(bodies.size).toBe(1);
    });
  });

  describe('valid requests', () => {
    it('should give the handler coerced query values and defaults', async () => {
      const response = await post(app, { query: { limit: '10' } });

      const { query } = response.body as {
        query: { limit: unknown; page: unknown };
      };

      expect(response.status).toBe(httpStatus.OK);
      expect(query.limit).toBe(10);
      expect(query.page).toBe(DEFAULT_PAGE);
    });
  });
});
