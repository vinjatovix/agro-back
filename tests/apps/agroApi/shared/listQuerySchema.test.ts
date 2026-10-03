import httpStatus from 'http-status';

import {
  getValidatedRequest,
  type RequestSchemas
} from '../../../../src/apps/agroApi/middlewares/validateRequest.js';
import {
  enumField,
  identifierField,
  LIST_LIMITS,
  listField,
  listQuerySchema,
  monthItem,
  rangeField,
  textField,
  textItem
} from '../../../../src/apps/agroApi/shared/listQuerySchema.js';
import { REQUEST_LIMITS } from '../../../../src/apps/agroApi/shared/requestSchemas.js';
import { HttpError } from '../../../../src/shared/errors/index.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from './fixtures/httpFakes.js';

const UNKNOWN_FIELD = 'Unknown field';
const USE_IN = "Use 'in' to match any of several values";
const USE_HAS_ANY = "Use 'hasAny' to match any of several values";
const ONE_OPERATOR = 'Use one operator per field';

const UUID_A = '0190a6a0-0000-7000-8000-000000000001';
const UUID_B = '0190a6a0-0000-7000-8000-000000000002';

const SENTINEL = 'zz-sentinel-9f3c';

// A listing that declares one field of every type.
const listThingsRequest = {
  query: listQuerySchema({
    filter: {
      name: textField(),
      owner: identifierField(),
      lifeCycle: enumField(['annual', 'biennial', 'perennial']),
      tags: listField(textItem),
      months: listField(monthItem),
      size: rangeField()
    },
    sortableKeys: ['name', 'slug']
  })
} satisfies RequestSchemas;

type Query = Record<string, unknown>;

const errorsOf = async (query: Query): Promise<Record<string, string>> => {
  const error = await runWithValidation(
    listThingsRequest,
    buildRequest({ query }),
    buildResponse().res
  );

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);

  return (error as HttpError).errors ?? {};
};

const parsedOf = async (query: Query) => {
  const { res } = buildResponse();
  const error = await runWithValidation(
    listThingsRequest,
    buildRequest({ query }),
    res
  );
  expect(error).toBeUndefined();

  return getValidatedRequest(res, listThingsRequest).query;
};

const filterOf = async (filter: Query) => (await parsedOf({ filter })).filter;

const DEFAULT_PAGINATION = {
  page: LIST_LIMITS.defaultPage,
  limit: LIST_LIMITS.defaultPageSize
};

describe('listQuerySchema', () => {
  describe('operators by field type', () => {
    it.each([
      ['text', 'name', 'eq', 'Rose'],
      ['text', 'name', 'contains', 'ros'],
      ['text', 'name', 'startsWith', 'Ro'],
      ['text', 'name', 'endsWith', 'se'],
      ['identifier', 'owner', 'eq', UUID_A],
      ['enumerated', 'lifeCycle', 'eq', 'annual'],
      ['list', 'tags', 'has', 'red'],
      ['range', 'size', 'eq', '20']
    ])(
      'should accept %s field %s with %s',
      async (_type, field, operator, value) => {
        const filter = await filterOf({ [field]: { [operator]: value } });

        expect(filter).toHaveProperty([field, operator]);
      }
    );

    it.each([
      ['text', 'name', 'in', 'Rose,Lily'],
      ['identifier', 'owner', 'in', `${UUID_A},${UUID_B}`],
      ['enumerated', 'lifeCycle', 'in', 'annual,biennial'],
      ['list', 'tags', 'hasAny', 'red,blue']
    ])(
      'should accept %s field %s with the list operator %s',
      async (_type, field, operator, value) => {
        const filter = await filterOf({ [field]: { [operator]: value } });

        expect(filter).toHaveProperty([field, operator]);
      }
    );

    it.each([
      ['name', 'regex'],
      ['name', 'gt'],
      ['owner', 'contains'],
      ['lifeCycle', 'startsWith'],
      ['tags', 'contains'],
      ['size', 'lte'],
      ['size', 'in']
    ])(
      'should reject %s with the undeclared operator %s',
      async (field, operator) => {
        const errors = await errorsOf({
          filter: { [field]: { [operator]: 'x' } }
        });

        expect(errors).toEqual({
          [`filter.${field}.${operator}`]: UNKNOWN_FIELD
        });
      }
    );

    it('should reject an undeclared field', async () => {
      const errors = await errorsOf({ filter: { password: { eq: 'x' } } });

      expect(errors).toEqual({ 'filter.password': UNKNOWN_FIELD });
    });
  });

  describe('single-value operators', () => {
    it('should trim the value', async () => {
      const filter = await filterOf({ name: { contains: '  ros  ' } });

      expect(filter).toEqual({ name: { contains: 'ros' } });
    });

    it.each([
      ['an array', ['Rose', 'Lily']],
      ['a nested object', { $ne: 'x' }],
      ['an empty value', ''],
      ['a blank value', '   ']
    ])('should reject %s', async (_label, value) => {
      const errors = await errorsOf({ filter: { name: { eq: value } } });

      expect(errors).toHaveProperty(['filter.name.eq']);
    });

    it('should hint at in when eq holds a comma', async () => {
      const errors = await errorsOf({ filter: { name: { eq: 'Rose,Lily' } } });

      expect(errors).toEqual({ 'filter.name.eq': USE_IN });
    });

    it('should hint at hasAny when has holds a comma', async () => {
      const errors = await errorsOf({ filter: { tags: { has: 'red,blue' } } });

      expect(errors).toEqual({ 'filter.tags.has': USE_HAS_ANY });
    });

    it.each(['contains', 'startsWith', 'endsWith'])(
      'should keep commas literal in %s',
      async (operator) => {
        const filter = await filterOf({ name: { [operator]: 'a, b' } });

        expect(filter).toEqual({ name: { [operator]: 'a, b' } });
      }
    );
  });

  describe('list operators', () => {
    it.each([
      ['a comma-separated string', ' Rose , ,Lily '],
      ['a repeated key', ['Rose', ' ', 'Lily']]
    ])('should accept %s', async (_label, value) => {
      const filter = await filterOf({ name: { in: value } });

      expect(filter).toEqual({ name: { in: ['Rose', 'Lily'] } });
    });

    it.each([
      ['no entry left', ' , , '],
      ['a nested object', { $ne: 'x' }],
      [
        'more entries than allowed',
        Array.from(
          { length: REQUEST_LIMITS.listItems + 1 },
          (_, i) => `n${i}`
        ).join(',')
      ]
    ])('should reject %s', async (_label, value) => {
      const errors = await errorsOf({ filter: { name: { in: value } } });

      expect(errors).toHaveProperty(['filter.name.in']);
    });

    it.each([
      ['lifeCycle', 'in', 'annual,yearly', 'filter.lifeCycle.in.1'],
      ['months', 'hasAny', '3,4,13', 'filter.months.hasAny.2'],
      ['owner', 'in', `${UUID_A},not-a-uuid`, 'filter.owner.in.1']
    ])(
      'should report an invalid entry of %s.%s at its index',
      async (field, operator, value, path) => {
        const errors = await errorsOf({
          filter: { [field]: { [operator]: value } }
        });

        expect(Object.keys(errors)).toEqual([path]);
      }
    );
  });

  describe('item types', () => {
    it.each([
      ['text too long', 'name', 'eq', 'x'.repeat(REQUEST_LIMITS.shortText + 1)],
      ['a value outside the enumeration', 'lifeCycle', 'eq', 'yearly'],
      ['an identifier that is not a UUID', 'owner', 'eq', 'abc'],
      ['a number that is not decimal', 'size', 'eq', '1e3'],
      ['a number that is not a number', 'size', 'eq', 'abc'],
      ['a month above 12', 'months', 'has', '13'],
      ['a month below 1', 'months', 'has', '0'],
      ['a month that is not whole', 'months', 'has', '1.5']
    ])('should reject %s', async (_label, field, operator, value) => {
      const errors = await errorsOf({
        filter: { [field]: { [operator]: value } }
      });

      expect(Object.keys(errors)).toEqual([`filter.${field}.${operator}`]);
    });

    it('should decode typed values', async () => {
      const filter = await filterOf({
        size: { eq: '-2.5' },
        months: { hasAny: '3,12' },
        lifeCycle: { in: 'annual,perennial' }
      });

      expect(filter).toEqual({
        size: { eq: -2.5 },
        months: { hasAny: [3, 12] },
        lifeCycle: { in: ['annual', 'perennial'] }
      });
    });

    it('should take one value for has', async () => {
      const filter = await filterOf({ months: { has: '5' } });

      expect(filter).toEqual({ months: { has: 5 } });
    });
  });

  describe('operator hints', () => {
    it.each([
      ['name', 'has'],
      ['name', 'hasAny'],
      ['owner', 'hasAny'],
      ['lifeCycle', 'has']
    ])('should hint at in for %s.%s', async (field, operator) => {
      const errors = await errorsOf({
        filter: { [field]: { [operator]: 'x' } }
      });

      expect(errors).toEqual({ [`filter.${field}.${operator}`]: USE_IN });
    });

    it('should hint at hasAny for in on a list field', async () => {
      const errors = await errorsOf({ filter: { tags: { in: 'red,blue' } } });

      expect(errors).toEqual({ 'filter.tags.in': USE_HAS_ANY });
    });
  });

  describe('one operator per field', () => {
    it('should reject two operators on the same field', async () => {
      const errors = await errorsOf({
        filter: { name: { contains: 'ros', eq: 'Rosaceae' } }
      });

      expect(errors).toEqual({ 'filter.name': ONE_OPERATOR });
    });

    it('should reject a field without operators', async () => {
      const errors = await errorsOf({ filter: { name: {} } });

      expect(errors).toEqual({ 'filter.name': ONE_OPERATOR });
    });

    it('should accept one operator on each of several fields', async () => {
      const filter = await filterOf({
        name: { contains: 'ros' },
        lifeCycle: { eq: 'annual' }
      });

      expect(filter).toEqual({
        name: { contains: 'ros' },
        lifeCycle: { eq: 'annual' }
      });
    });
  });

  describe('sort', () => {
    it('should accept declared keys with asc or desc', async () => {
      const { sort } = await parsedOf({ sort: { name: 'asc', slug: 'desc' } });

      expect(sort).toEqual({ name: 'asc', slug: 'desc' });
    });

    it.each([
      ['an uppercase direction', { name: 'ASC' }, 'sort.name'],
      ['another direction', { name: 'up' }, 'sort.name'],
      ['an undeclared key', { password: 'asc' }, 'sort.password'],
      ['the JSON-string form', '{"name":"asc"}', 'sort']
    ])('should reject %s', async (_label, sort, path) => {
      const errors = await errorsOf({ sort });

      expect(Object.keys(errors)).toEqual([path]);
    });

    it('should leave out an empty sort', async () => {
      const query = await parsedOf({ sort: {} });

      expect(query).not.toHaveProperty('sort');
    });
  });

  describe('pagination', () => {
    it('should apply the defaults when absent', async () => {
      const query = await parsedOf({});

      expect(query).toEqual({ pagination: DEFAULT_PAGINATION });
    });

    it('should decode page and limit', async () => {
      const { pagination } = await parsedOf({
        pagination: { page: '2', limit: String(LIST_LIMITS.maxPageSize) }
      });

      expect(pagination).toEqual({ page: 2, limit: LIST_LIMITS.maxPageSize });
    });

    it('should apply the default of a missing value', async () => {
      const { pagination } = await parsedOf({ pagination: { page: '3' } });

      expect(pagination).toEqual({
        page: 3,
        limit: LIST_LIMITS.defaultPageSize
      });
    });

    it.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', '1.5'],
      ['page', '1e3'],
      ['page', '0x10'],
      ['page', ''],
      ['page', '99999999999999999999'],
      ['limit', 'abc'],
      ['limit', String(LIST_LIMITS.maxPageSize + 1)]
    ])('should reject %s %j', async (key, value) => {
      const errors = await errorsOf({ pagination: { [key]: value } });

      expect(Object.keys(errors)).toEqual([`pagination.${key}`]);
    });

    it('should name the maximum page size when limit is too big', async () => {
      const errors = await errorsOf({
        pagination: { limit: String(LIST_LIMITS.maxPageSize + 1) }
      });

      expect(errors['pagination.limit']).toContain(
        String(LIST_LIMITS.maxPageSize)
      );
    });

    it('should reject an unknown pagination key', async () => {
      const errors = await errorsOf({ pagination: { size: '5' } });

      expect(errors).toEqual({ 'pagination.size': UNKNOWN_FIELD });
    });
  });

  describe('top level', () => {
    it.each(['include', 'foo'])(
      'should reject the unknown key %s',
      async (key) => {
        const errors = await errorsOf({ [key]: 'x' });

        expect(errors).toEqual({ [key]: UNKNOWN_FIELD });
      }
    );

    it('should reject a filter sent as text', async () => {
      const errors = await errorsOf({ filter: 'name' });

      expect(Object.keys(errors)).toEqual(['filter']);
    });
  });

  describe('error messages', () => {
    it.each([
      ['an unknown operator', { filter: { name: { [SENTINEL]: 'x' } } }],
      ['a wrong type', { filter: { name: { eq: [SENTINEL, SENTINEL] } } }],
      ['a wrong enum value', { filter: { lifeCycle: { eq: SENTINEL } } }],
      ['a comma in eq', { filter: { name: { eq: `${SENTINEL},x` } } }],
      [
        'two operators',
        { filter: { name: { eq: SENTINEL, contains: SENTINEL } } }
      ],
      ['a limit too big', { pagination: { limit: '1000000' } }],
      ['an invalid sort', { sort: { name: SENTINEL } }],
      ['a wrong UUID', { filter: { owner: { in: `${SENTINEL},x` } } }],
      ['a wrong number', { filter: { size: { eq: SENTINEL } } }]
    ])('should not echo the value for %s', async (_label, query) => {
      const errors = await errorsOf(query);

      for (const message of Object.values(errors)) {
        expect(message).not.toContain(SENTINEL);
      }
    });

    it('should state the expected values of an enumeration', async () => {
      const errors = await errorsOf({
        filter: { lifeCycle: { eq: 'yearly' } }
      });

      expect(errors['filter.lifeCycle.eq']).toContain('perennial');
    });
  });
});
