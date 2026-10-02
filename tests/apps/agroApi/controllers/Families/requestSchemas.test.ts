import httpStatus from 'http-status';

import {
  createFamilyRequest,
  getFamilyByIdOrSlugRequest,
  listFamiliesRequest,
  updateFamilyRequest
} from '../../../../../src/apps/agroApi/controllers/Families/requestSchemas.js';
import {
  getValidatedRequest,
  type RequestSchemas,
  type ValidatedRequest
} from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { REQUEST_LIMITS } from '../../../../../src/apps/agroApi/shared/requestSchemas.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { withPath } from '../../../../shared/dto/editPath.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import {
  buildFullCreateFamilyBody,
  buildMinimalCreateFamilyBody
} from './fixtures/familyBodies.js';

type RequestParts = Parameters<typeof buildRequest>[0];

const UNKNOWN_FIELD = 'Unknown field';

const REQUIRED_SHORT_TEXTS = ['slug', 'name', 'scientificName'] as const;

const REQUIRED_TEXTS = [...REQUIRED_SHORT_TEXTS, 'shortDescription'] as const;

const tooLong = (limit: number): string => 'x'.repeat(limit + 1);

const tooMany = (): string[] =>
  Array.from({ length: REQUEST_LIMITS.listItems + 1 }, (_, i) => `item ${i}`);

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

describe('Family requestSchemas', () => {
  describe('createFamilyRequest', () => {
    it.each([
      ['a minimal body', buildMinimalCreateFamilyBody()],
      ['a full body', buildFullCreateFamilyBody()],
      ['an empty extra', buildMinimalCreateFamilyBody({ extra: {} })]
    ])('should accept %s', async (_label, body) => {
      // Act
      const error = await validate(createFamilyRequest, { body });

      // Assert
      expect(error).toBeUndefined();
    });

    it('should trim a padded name', async () => {
      // Arrange
      const body = buildMinimalCreateFamilyBody({ name: '  Rosaceae  ' });

      // Act
      const { body: parsed } = await parsedOf(createFamilyRequest, { body });

      // Assert
      expect(parsed.name).toBe('Rosaceae');
    });

    it.each(
      REQUIRED_TEXTS.flatMap((field) =>
        ['', '   ', null].map((value) => [field, value] as const)
      )
    )('should reject %s set to %j', async (field, value) => {
      // Arrange
      const body = buildMinimalCreateFamilyBody({ [field]: value });

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors).toHaveProperty([field]);
    });

    it.each([
      ...REQUIRED_SHORT_TEXTS.map(
        (field) => [field, tooLong(REQUEST_LIMITS.shortText)] as const
      ),
      ['shortDescription', tooLong(REQUEST_LIMITS.longText)] as const
    ])('should reject %s over its length limit', async (field, value) => {
      // Arrange
      const body = buildMinimalCreateFamilyBody({ [field]: value });

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors).toHaveProperty([field]);
    });

    it('should reject an invalid id without echoing it', async () => {
      // Arrange
      const body = buildMinimalCreateFamilyBody({ id: 'not-a-uuid' });

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors).toHaveProperty(['id']);
      expect(JSON.stringify(errors)).not.toContain('not-a-uuid');
    });

    it.each([
      ['highlights', 'a text', 'x'],
      ['aliases', 'null', null],
      ['extra', 'null', null],
      ['extra', 'a list', []],
      ['extra.order', 'null', null],
      ['extra.speciesCount', 'zero', 0],
      ['extra.speciesCount', 'a decimal', 1.5],
      ['aliases', 'too many entries', tooMany()],
      ['highlights', 'too many entries', tooMany()],
      ['extra.subfamilies', 'too many entries', tooMany()]
    ])('should reject %s set to %s', async (path, _label, value) => {
      // Arrange
      const body = withPath(buildFullCreateFamilyBody(), path, value);

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors).toHaveProperty([path]);
    });

    it.each([
      ['aliases', tooLong(REQUEST_LIMITS.shortText)],
      ['highlights', tooLong(REQUEST_LIMITS.longText)],
      ['aliases', 1],
      ['highlights', 1]
    ])(
      'should reject an invalid %s entry at its index',
      async (field, entry) => {
        // Arrange
        const body = buildMinimalCreateFamilyBody({
          [field]: ['Valid', entry]
        });

        // Act
        const errors = await errorsOf(createFamilyRequest, { body });

        // Assert
        expect(errors).toHaveProperty([`${field}.1`]);
      }
    );

    it('should reject missing highlights', async () => {
      // Arrange
      const { highlights: _highlights, ...body } =
        buildMinimalCreateFamilyBody();

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors).toHaveProperty(['highlights']);
    });

    it.each([
      ['extra.invalidField', 'extra.invalidField'],
      ['a top-level unknown key', 'unknown']
    ])('should report %s as an unknown field', async (_label, path) => {
      // Arrange
      const body = withPath(buildFullCreateFamilyBody(), path, 1);

      // Act
      const errors = await errorsOf(createFamilyRequest, { body });

      // Assert
      expect(errors[path]).toBe(UNKNOWN_FIELD);
    });

    it('should report any query key as an unknown field', async () => {
      // Arrange
      const body = buildMinimalCreateFamilyBody();

      // Act
      const errors = await errorsOf(createFamilyRequest, {
        body,
        query: { foo: 'bar' }
      });

      // Assert
      expect(errors.foo).toBe(UNKNOWN_FIELD);
    });
  });

  describe('updateFamilyRequest', () => {
    const params = { idOrSlug: 'rosaceae' };

    it.each([
      ['an empty body', {}],
      ['a name alone', { name: 'Rosaceae' }],
      ['extra: null', { extra: null }],
      ['an empty extra', { extra: {} }],
      ['a cleared extra key', { extra: { order: null } }],
      [
        'every extra key cleared',
        {
          extra: {
            order: null,
            distribution: null,
            speciesCount: null,
            subfamilies: null
          }
        }
      ]
    ])('should accept %s', async (_label, body) => {
      // Act
      const error = await validate(updateFamilyRequest, { params, body });

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject a missing body', async () => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, { params });

      // Assert
      expect(errors).toHaveProperty(['body']);
    });

    it.each(
      REQUIRED_TEXTS.flatMap((field) =>
        ['', '   ', null].map((value) => [field, value] as const)
      )
    )('should reject %s set to %j', async (field, value) => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, {
        params,
        body: { [field]: value }
      });

      // Assert
      expect(errors).toHaveProperty([field]);
    });

    it.each([
      ['aliases', { aliases: null }],
      ['highlights', { highlights: null }],
      ['extra.speciesCount', { extra: { speciesCount: 0 } }],
      ['extra.speciesCount', { extra: { speciesCount: 1.5 } }],
      ['extra.subfamilies.0', { extra: { subfamilies: [1] } }]
    ])('should reject an invalid %s', async (path, body) => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, { params, body });

      // Assert
      expect(errors).toHaveProperty([path]);
    });

    it.each([
      ['id', { id: random.uuid() }],
      ['version', { version: 99 }],
      ['extra.unknown', { extra: { unknown: 1 } }]
    ])('should report %s as an unknown field', async (path, body) => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, { params, body });

      // Assert
      expect(errors[path]).toBe(UNKNOWN_FIELD);
    });

    it('should report any query key as an unknown field', async () => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, {
        params,
        query: { foo: 'bar' },
        body: {}
      });

      // Assert
      expect(errors.foo).toBe(UNKNOWN_FIELD);
    });

    it.each([
      ['blank', '   '],
      ['too long', tooLong(REQUEST_LIMITS.shortText)]
    ])('should reject a %s idOrSlug', async (_label, idOrSlug) => {
      // Act
      const errors = await errorsOf(updateFamilyRequest, {
        params: { idOrSlug },
        body: {}
      });

      // Assert
      expect(errors).toHaveProperty(['idOrSlug']);
    });
  });

  describe('getFamilyByIdOrSlugRequest', () => {
    it.each([
      ['a UUID', random.uuid()],
      ['a slug', 'rosaceae']
    ])('should accept %s', async (_label, idOrSlug) => {
      // Act
      const error = await validate(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug }
      });

      // Assert
      expect(error).toBeUndefined();
    });

    it('should trim the identifier', async () => {
      // Act
      const { params } = await parsedOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: '  rosaceae ' }
      });

      // Assert
      expect(params.idOrSlug).toBe('rosaceae');
    });

    it.each([
      ['blank', '   '],
      ['too long', tooLong(REQUEST_LIMITS.shortText)]
    ])('should reject a %s idOrSlug', async (_label, idOrSlug) => {
      // Act
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug }
      });

      // Assert
      expect(errors).toHaveProperty(['idOrSlug']);
    });

    it('should report any query key as an unknown field', async () => {
      // Act
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        query: { x: '1' }
      });

      // Assert
      expect(errors.x).toBe(UNKNOWN_FIELD);
    });

    it('should accept an empty body', async () => {
      // Act
      const error = await validate(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        body: {}
      });

      // Assert
      expect(error).toBeUndefined();
    });

    it('should report a body field as an unknown field', async () => {
      // Act
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        body: { name: 'Rosaceae' }
      });

      // Assert
      expect(errors.name).toBe(UNKNOWN_FIELD);
    });
  });

  describe('listFamiliesRequest', () => {
    const listErrorsOf = (query: Record<string, unknown>) =>
      errorsOf(listFamiliesRequest, { query });

    const listQueryOf = async (query: Record<string, unknown>) =>
      (await parsedOf(listFamiliesRequest, { query })).query;

    it.each<[string, string, string]>([
      ['id', 'eq', random.uuid()],
      ['id', 'in', `${random.uuid()},${random.uuid()}`],
      ...['slug', 'name', 'scientificName'].flatMap((field) =>
        ['eq', 'in', 'contains', 'startsWith', 'endsWith'].map(
          (operator): [string, string, string] => [field, operator, 'Aster']
        )
      ),
      ['aliases', 'has', 'rose'],
      ['aliases', 'hasAny', 'rose,flower']
    ])('should accept %s with %s', async (field, operator, value) => {
      // Act
      const query = await listQueryOf({
        filter: { [field]: { [operator]: value } }
      });

      // Assert
      expect(query.filter).toHaveProperty([field, operator]);
    });

    it.each(['name', 'scientificName', 'slug'])(
      'should sort by %s',
      async (key) => {
        // Act
        const query = await listQueryOf({ sort: { [key]: 'desc' } });

        // Assert
        expect(query.sort).toEqual({ [key]: 'desc' });
      }
    );

    it('should reject an undeclared field', async () => {
      // Act
      const errors = await listErrorsOf({ filter: { password: { eq: 'x' } } });

      // Assert
      expect(errors).toEqual({ 'filter.password': UNKNOWN_FIELD });
    });

    it.each(['has', 'hasAny'])(
      'should hint at in for name with %s',
      async (operator) => {
        // Act
        const errors = await listErrorsOf({
          filter: { name: { [operator]: 'Asteraceae' } }
        });

        // Assert
        expect(errors).toEqual({
          [`filter.name.${operator}`]: "Use 'in' to match any of several values"
        });
      }
    );

    it('should decode several names in in', async () => {
      // Act
      const query = await listQueryOf({
        filter: { name: { in: 'Asteraceae,Solanaceae' } }
      });

      // Assert
      expect(query.filter).toEqual({
        name: { in: ['Asteraceae', 'Solanaceae'] }
      });
    });

    it('should page with the defaults when the query is empty', async () => {
      // Act
      const query = await listQueryOf({});

      // Assert
      expect(query).toEqual({ pagination: { page: 1, limit: 25 } });
    });
  });
});
