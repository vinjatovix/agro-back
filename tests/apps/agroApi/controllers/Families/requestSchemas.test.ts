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
      const error = await validate(createFamilyRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should trim a padded name', async () => {
      const body = buildMinimalCreateFamilyBody({ name: '  Rosaceae  ' });

      const { body: parsed } = await parsedOf(createFamilyRequest, { body });

      expect(parsed.name).toBe('Rosaceae');
    });

    it.each(
      REQUIRED_TEXTS.flatMap((field) =>
        ['', '   ', null].map((value) => [field, value] as const)
      )
    )('should reject %s set to %j', async (field, value) => {
      const body = buildMinimalCreateFamilyBody({ [field]: value });

      const errors = await errorsOf(createFamilyRequest, { body });

      expect(errors).toHaveProperty([field]);
    });

    it.each([
      ...REQUIRED_SHORT_TEXTS.map(
        (field) => [field, tooLong(REQUEST_LIMITS.shortText)] as const
      ),
      ['shortDescription', tooLong(REQUEST_LIMITS.longText)] as const
    ])('should reject %s over its length limit', async (field, value) => {
      const body = buildMinimalCreateFamilyBody({ [field]: value });

      const errors = await errorsOf(createFamilyRequest, { body });

      expect(errors).toHaveProperty([field]);
    });

    it('should reject an invalid id without echoing it', async () => {
      const body = buildMinimalCreateFamilyBody({ id: 'not-a-uuid' });

      const errors = await errorsOf(createFamilyRequest, { body });

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
      const body = withPath(buildFullCreateFamilyBody(), path, value);

      const errors = await errorsOf(createFamilyRequest, { body });

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
        const body = buildMinimalCreateFamilyBody({
          [field]: ['Valid', entry]
        });

        const errors = await errorsOf(createFamilyRequest, { body });

        expect(errors).toHaveProperty([`${field}.1`]);
      }
    );

    it('should reject missing highlights', async () => {
      const { highlights: _highlights, ...body } =
        buildMinimalCreateFamilyBody();

      const errors = await errorsOf(createFamilyRequest, { body });

      expect(errors).toHaveProperty(['highlights']);
    });

    it.each([
      ['extra.invalidField', 'extra.invalidField'],
      ['a top-level unknown key', 'unknown']
    ])('should report %s as an unknown field', async (_label, path) => {
      const body = withPath(buildFullCreateFamilyBody(), path, 1);

      const errors = await errorsOf(createFamilyRequest, { body });

      expect(errors[path]).toBe(UNKNOWN_FIELD);
    });

    it('should report any query key as an unknown field', async () => {
      const body = buildMinimalCreateFamilyBody();

      const errors = await errorsOf(createFamilyRequest, {
        body,
        query: { foo: 'bar' }
      });

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
      const error = await validate(updateFamilyRequest, { params, body });

      expect(error).toBeUndefined();
    });

    it('should reject a missing body', async () => {
      const errors = await errorsOf(updateFamilyRequest, { params });

      expect(errors).toHaveProperty(['body']);
    });

    it.each(
      REQUIRED_TEXTS.flatMap((field) =>
        ['', '   ', null].map((value) => [field, value] as const)
      )
    )('should reject %s set to %j', async (field, value) => {
      const errors = await errorsOf(updateFamilyRequest, {
        params,
        body: { [field]: value }
      });

      expect(errors).toHaveProperty([field]);
    });

    it.each([
      ['aliases', { aliases: null }],
      ['highlights', { highlights: null }],
      ['extra.speciesCount', { extra: { speciesCount: 0 } }],
      ['extra.speciesCount', { extra: { speciesCount: 1.5 } }],
      ['extra.subfamilies.0', { extra: { subfamilies: [1] } }]
    ])('should reject an invalid %s', async (path, body) => {
      const errors = await errorsOf(updateFamilyRequest, { params, body });

      expect(errors).toHaveProperty([path]);
    });

    it.each([
      ['id', { id: random.uuid() }],
      ['version', { version: 99 }],
      ['extra.unknown', { extra: { unknown: 1 } }]
    ])('should report %s as an unknown field', async (path, body) => {
      const errors = await errorsOf(updateFamilyRequest, { params, body });

      expect(errors[path]).toBe(UNKNOWN_FIELD);
    });

    it('should report any query key as an unknown field', async () => {
      const errors = await errorsOf(updateFamilyRequest, {
        params,
        query: { foo: 'bar' },
        body: {}
      });

      expect(errors.foo).toBe(UNKNOWN_FIELD);
    });

    it.each([
      ['blank', '   '],
      ['too long', tooLong(REQUEST_LIMITS.shortText)]
    ])('should reject a %s idOrSlug', async (_label, idOrSlug) => {
      const errors = await errorsOf(updateFamilyRequest, {
        params: { idOrSlug },
        body: {}
      });

      expect(errors).toHaveProperty(['idOrSlug']);
    });
  });

  describe('getFamilyByIdOrSlugRequest', () => {
    it.each([
      ['a UUID', random.uuid()],
      ['a slug', 'rosaceae']
    ])('should accept %s', async (_label, idOrSlug) => {
      const error = await validate(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug }
      });

      expect(error).toBeUndefined();
    });

    it('should trim the identifier', async () => {
      const { params } = await parsedOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: '  rosaceae ' }
      });

      expect(params.idOrSlug).toBe('rosaceae');
    });

    it.each([
      ['blank', '   '],
      ['too long', tooLong(REQUEST_LIMITS.shortText)]
    ])('should reject a %s idOrSlug', async (_label, idOrSlug) => {
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug }
      });

      expect(errors).toHaveProperty(['idOrSlug']);
    });

    it('should report any query key as an unknown field', async () => {
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        query: { x: '1' }
      });

      expect(errors.x).toBe(UNKNOWN_FIELD);
    });

    it('should accept an empty body', async () => {
      const error = await validate(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        body: {}
      });

      expect(error).toBeUndefined();
    });

    it('should report a body field as an unknown field', async () => {
      const errors = await errorsOf(getFamilyByIdOrSlugRequest, {
        params: { idOrSlug: 'rosaceae' },
        body: { name: 'Rosaceae' }
      });

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
      const query = await listQueryOf({
        filter: { [field]: { [operator]: value } }
      });

      expect(query.filter).toHaveProperty([field, operator]);
    });

    it.each(['name', 'scientificName', 'slug'])(
      'should sort by %s',
      async (key) => {
        const query = await listQueryOf({ sort: { [key]: 'desc' } });

        expect(query.sort).toEqual({ [key]: 'desc' });
      }
    );

    it('should reject an undeclared field', async () => {
      const errors = await listErrorsOf({ filter: { password: { eq: 'x' } } });

      expect(errors).toEqual({ 'filter.password': UNKNOWN_FIELD });
    });

    it.each(['has', 'hasAny'])(
      'should hint at in for name with %s',
      async (operator) => {
        const errors = await listErrorsOf({
          filter: { name: { [operator]: 'Asteraceae' } }
        });

        expect(errors).toEqual({
          [`filter.name.${operator}`]: "Use 'in' to match any of several values"
        });
      }
    );

    it('should decode several names in in', async () => {
      const query = await listQueryOf({
        filter: { name: { in: 'Asteraceae,Solanaceae' } }
      });

      expect(query.filter).toEqual({
        name: { in: ['Asteraceae', 'Solanaceae'] }
      });
    });

    it('should page with the defaults when the query is empty', async () => {
      const query = await listQueryOf({});

      expect(query).toEqual({ pagination: { page: 1, limit: 25 } });
    });
  });
});
