import httpStatus from 'http-status';
import { z } from 'zod';

import { strictifySchema } from '../../../../../src/apps/agroApi/middlewares/helpers/strictifySchema.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';

import {
  catchallSchema,
  failingRecursivePair,
  foreignTypeSchema,
  leafObject,
  leafWithUnknown,
  looseRecordSchema,
  passthroughSchema,
  plainUnionSchema,
  recursiveGetterSchema,
  recursiveTreeSchema,
  refinedSchema,
  transformingSchema,
  validLeaf,
  withCatchSchema,
  withIntersectionSchema,
  withMapSchema,
  withPromiseSchema,
  withSetSchema,
  wrapperCases
} from '../fixtures/strictifySchemas.js';

const unrecognizedPaths = (
  schema: z.ZodType,
  input: unknown
): ReadonlyArray<ReadonlyArray<PropertyKey>> =>
  (schema.safeParse(input).error?.issues ?? [])
    .filter((issue) => issue.code === 'unrecognized_keys')
    .map((issue) => issue.path);

const captureError = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('strictifySchema', () => {
  describe.each(Object.entries(wrapperCases()))('%s', (_name, testCase) => {
    it('should reject unknown keys', () => {
      const strict = strictifySchema(testCase.schema);

      expect(unrecognizedPaths(strict, testCase.invalid)).toEqual([
        testCase.unknownPath
      ]);
    });

    it('should parse valid input to the same output as the original', () => {
      const strict = strictifySchema(testCase.schema);

      expect(strict.parse(testCase.valid)).toEqual(
        testCase.schema.parse(testCase.valid)
      );
    });

    it('should not change the original schema', () => {
      strictifySchema(testCase.schema);

      expect(testCase.schema.safeParse(testCase.invalid).success).toBe(true);
    });
  });

  it('should reject unknown keys at any depth of a recursive lazy schema', () => {
    const strict = strictifySchema(recursiveTreeSchema());

    expect(
      unrecognizedPaths(strict, {
        name: 'root',
        children: [{ name: 'child', children: [{ name: 'leaf', extra: 1 }] }]
      })
    ).toEqual([['children', 0, 'children', 0]]);
    expect(
      strict.safeParse({ name: 'root', children: [{ name: 'child' }] }).success
    ).toBe(true);
  });

  it('should reject unknown keys at any depth of a recursive getter schema', () => {
    const strict = strictifySchema(recursiveGetterSchema());

    expect(
      unrecognizedPaths(strict, {
        name: 'root',
        subcategories: [
          { name: 'child', subcategories: [{ name: 'leaf', extra: 1 }] }
        ]
      })
    ).toEqual([['subcategories', 0, 'subcategories', 0]]);
    expect(
      strict.safeParse({ name: 'root', subcategories: [{ name: 'child' }] })
        .success
    ).toBe(true);
  });

  it('should report unknown keys in a plain union at the union path', () => {
    const strict = strictifySchema(z.object({ choice: plainUnionSchema() }));

    const result = strict.safeParse({ choice: { a: 'x', extra: 1 } });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.every((issue) => issue.path.join('.') === 'choice')
    ).toBe(true);
  });

  it('should keep defaults, coercions and transforms', () => {
    const schema = transformingSchema();
    const input = { limit: '10', tags: 'a,b' };

    expect(strictifySchema(schema).parse(input)).toEqual(schema.parse(input));
  });

  it('should keep object-level refinements', () => {
    const strict = strictifySchema(refinedSchema());

    const result = strict.safeParse({ from: 5, to: 1 });

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['to']]);
  });

  it('should keep an already strict object strict', () => {
    const strict = strictifySchema(z.strictObject({ name: z.string() }));

    expect(unrecognizedPaths(strict, { name: 'x', extra: 1 })).toEqual([[]]);
  });

  it.each([
    ['catch', withCatchSchema()],
    ['intersection', withIntersectionSchema()],
    ['looseObject', passthroughSchema()],
    ['catchall', catchallSchema()],
    ['looseRecord', looseRecordSchema()],
    ['set', withSetSchema()],
    ['map', withMapSchema()],
    ['promise', withPromiseSchema()],
    ['an unknown schema type', foreignTypeSchema('thirdParty')],
    ['a type named like a prototype key', foreignTypeSchema('constructor')]
  ])('should throw an internal error for %s', (_name, schema) => {
    const error = captureError(() => strictifySchema(schema));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(
      httpStatus.INTERNAL_SERVER_ERROR
    );
  });

  it('should return primitive schemas unchanged', () => {
    const schema = z.string();

    expect(strictifySchema(schema)).toBe(schema);
  });

  it('should return the same instance for the same input schema', () => {
    const schema = leafObject();

    expect(strictifySchema(schema)).toBe(strictifySchema(schema));
  });

  it('should return a strict result unchanged when strictified again', () => {
    const strict = strictifySchema(z.object({ inner: leafObject() }));

    expect(strictifySchema(strict)).toBe(strict);
  });

  it('should keep a shared sub-schema strict wherever it is used', () => {
    const leaf = leafObject();
    const strict = strictifySchema(z.object({ first: leaf, second: leaf }));

    expect(
      unrecognizedPaths(strict, {
        first: validLeaf(),
        second: leafWithUnknown()
      })
    ).toEqual([['second']]);
  });

  it('should not cache sub-schemas of a walk that failed', () => {
    const { outer, inner } = failingRecursivePair();

    expect(() => strictifySchema(outer)).toThrow(HttpError);
    expect(() => strictifySchema(inner)).toThrow(HttpError);
  });

  it('should return a fresh default value on every parse', () => {
    const strict = strictifySchema(
      z.object({ list: z.array(z.string()).default([]) })
    );

    const first = strict.parse({});
    first.list.push('mutated');

    expect(strict.parse({})).toEqual({ list: [] });
  });
});
