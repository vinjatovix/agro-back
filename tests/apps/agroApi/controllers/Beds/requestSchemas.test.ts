import httpStatus from 'http-status';

import {
  createBedRequest,
  deleteBedRequest,
  getBedByIdRequest,
  listBedsRequest,
  updateBedRequest
} from '../../../../../src/apps/agroApi/controllers/Beds/requestSchemas.js';
import {
  getValidatedRequest,
  type RequestSchemas,
  type ValidatedRequest
} from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { REQUEST_LIMITS } from '../../../../../src/apps/agroApi/shared/requestSchemas.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import {
  buildCreateBedBody,
  buildUpdateBedBody
} from './fixtures/bedBodies.js';

type RequestParts = Parameters<typeof buildRequest>[0];

const UNKNOWN_FIELD = 'Unknown field';

const SENTINEL = 'zz-sentinel-7b1d';

const DIMENSIONS = ['width', 'height', 'depth'];

type InvalidCase = [string, Record<string, unknown>, string];

const validate = (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<unknown> =>
  runWithValidation(schemas, buildRequest(parts), buildResponse().res);

const errorsOf = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<Record<string, string>> => {
  const error = await validate(schemas, parts);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);

  return (error as HttpError).errors ?? {};
};

/** Runs a valid request and returns the parts the controller would read. */
const parsedOf = async <S extends RequestSchemas>(
  schemas: S,
  parts: RequestParts
): Promise<ValidatedRequest<S>> => {
  const { res } = buildResponse();
  const error = await runWithValidation(schemas, buildRequest(parts), res);
  expect(error).toBeUndefined();

  return getValidatedRequest(res, schemas);
};

const bedParams = () => ({ id: random.uuid() });

describe('Bed requestSchemas', () => {
  describe('createBedRequest', () => {
    it('should accept a valid body and trim the name', async () => {
      // Arrange
      const body = buildCreateBedBody({ name: '  Raised bed  ' });

      // Act
      const parsed = await parsedOf(createBedRequest, { body });

      // Assert
      expect(parsed.body).toEqual({ ...body, name: 'Raised bed' });
    });

    it.each<InvalidCase>([
      ['an empty name', { name: '' }, 'name'],
      ['a blank name', { name: '   ' }, 'name'],
      [
        'a name too long',
        { name: 'x'.repeat(REQUEST_LIMITS.shortText + 1) },
        'name'
      ],
      ['a null name', { name: null }, 'name'],
      ['an id that is not a UUID', { id: 'bed-1' }, 'id'],
      ...DIMENSIONS.flatMap((field): InvalidCase[] => [
        [`a zero ${field}`, { [field]: 0 }, field],
        [`a negative ${field}`, { [field]: -1 }, field],
        [`a numeric string ${field}`, { [field]: '1.5' }, field],
        [`a null ${field}`, { [field]: null }, field]
      ])
    ])('should reject %s', async (_label, overrides, field) => {
      // Act
      const errors = await errorsOf(createBedRequest, {
        body: buildCreateBedBody(overrides)
      });

      // Assert
      expect(Object.keys(errors)).toEqual([field]);
    });

    it.each(['userId', 'plantInstances', 'unexpected'])(
      'should report %s as an unknown field',
      async (key) => {
        // Act
        const errors = await errorsOf(createBedRequest, {
          body: buildCreateBedBody({ [key]: [] })
        });

        // Assert
        expect(errors).toEqual({ [key]: UNKNOWN_FIELD });
      }
    );

    it('should report one error per missing field for an empty body', async () => {
      // Act
      const errors = await errorsOf(createBedRequest, { body: {} });

      // Assert
      expect(Object.keys(errors).sort()).toEqual(
        ['depth', 'height', 'id', 'name', 'width'].sort()
      );
    });

    it('should report a query key as an unknown field', async () => {
      // Act
      const errors = await errorsOf(createBedRequest, {
        query: { x: '1' },
        body: buildCreateBedBody()
      });

      // Assert
      expect(errors).toEqual({ x: UNKNOWN_FIELD });
    });

    it('should not echo the submitted values', async () => {
      // Act
      const errors = await errorsOf(createBedRequest, {
        body: buildCreateBedBody({
          id: SENTINEL,
          name: 'x'.repeat(REQUEST_LIMITS.shortText) + SENTINEL,
          width: SENTINEL
        })
      });

      // Assert
      for (const message of Object.values(errors)) {
        expect(message).not.toContain(SENTINEL);
      }
    });
  });

  describe.each([
    ['listBedsRequest', listBedsRequest, {}],
    ['getBedByIdRequest', getBedByIdRequest, { params: bedParams() }],
    ['deleteBedRequest', deleteBedRequest, { params: bedParams() }]
  ])('%s', (_name, schemas: RequestSchemas, parts: RequestParts) => {
    it('should accept a request without body', async () => {
      // Act
      const error = await validate(schemas, parts);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should report a query key as an unknown field', async () => {
      // Act
      const errors = await errorsOf(schemas, { ...parts, query: { x: '1' } });

      // Assert
      expect(errors).toEqual({ x: UNKNOWN_FIELD });
    });

    it('should report a body field as an unknown field', async () => {
      // Act
      const errors = await errorsOf(schemas, {
        ...parts,
        body: { name: 'Bed' }
      });

      // Assert
      expect(errors).toEqual({ name: UNKNOWN_FIELD });
    });
  });

  describe.each([
    ['getBedByIdRequest', getBedByIdRequest],
    ['updateBedRequest', updateBedRequest],
    ['deleteBedRequest', deleteBedRequest]
  ])('%s params', (_name, schemas: RequestSchemas) => {
    it('should reject an id that is not a UUID', async () => {
      // Act
      const errors = await errorsOf(schemas, {
        params: { id: 'not-a-uuid' },
        body: {}
      });

      // Assert
      expect(Object.keys(errors)).toEqual(['id']);
    });
  });

  describe('updateBedRequest', () => {
    it.each([
      ['an empty body', {}],
      ['only the name', { name: 'Bed' }],
      ['only the depth', { depth: 40 }],
      ['every field', buildUpdateBedBody()]
    ])('should accept %s', async (_label, body) => {
      // Act
      const parsed = await parsedOf(updateBedRequest, {
        params: bedParams(),
        body
      });

      // Assert
      expect(parsed.body).toEqual(body);
    });

    it('should trim the name', async () => {
      // Act
      const parsed = await parsedOf(updateBedRequest, {
        params: bedParams(),
        body: { name: '  Bed  ' }
      });

      // Assert
      expect(parsed.body).toEqual({ name: 'Bed' });
    });

    it.each<InvalidCase>([
      ['a null name', { name: null }, 'name'],
      ['a blank name', { name: '  ' }, 'name'],
      ...DIMENSIONS.flatMap((field): InvalidCase[] => [
        [`a null ${field}`, { [field]: null }, field],
        [`a zero ${field}`, { [field]: 0 }, field]
      ])
    ])('should reject %s', async (_label, body, field) => {
      // Act
      const errors = await errorsOf(updateBedRequest, {
        params: bedParams(),
        body
      });

      // Assert
      expect(Object.keys(errors)).toEqual([field]);
    });

    it.each(['plantInstances', 'userId', 'id'])(
      'should report %s as an unknown field',
      async (key) => {
        // Act
        const errors = await errorsOf(updateBedRequest, {
          params: bedParams(),
          body: { [key]: [] }
        });

        // Assert
        expect(errors).toEqual({ [key]: UNKNOWN_FIELD });
      }
    );

    it('should report a query key as an unknown field', async () => {
      // Act
      const errors = await errorsOf(updateBedRequest, {
        params: bedParams(),
        query: { x: '1' },
        body: {}
      });

      // Assert
      expect(errors).toEqual({ x: UNKNOWN_FIELD });
    });
  });
});
