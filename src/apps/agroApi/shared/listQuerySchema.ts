import { z } from 'zod';

import { REQUEST_LIMITS } from './requestSchemas.js';

// Listing query: `filter`, `sort` and `pagination`, decoded from the query
// string into the `QueryOptions` the use cases take. Every field declares its
// operators; anything else is an unknown field (the validation step makes the
// schema strict). Values are typed by the field, never guessed from the text.

export const LIST_LIMITS = {
  defaultPage: 1,
  defaultPageSize: 25,
  maxPageSize: 100
} as const;

const USE_IN = "Use 'in' to match any of several values";
const USE_HAS_ANY = "Use 'hasAny' to match any of several values";
const ONE_OPERATOR = 'Use one operator per field';

/** Decodes one query-string entry into a typed value. */
type ItemSchema<T> = z.ZodType<T, string>;

const trimmed = <T>(item: z.ZodType<T, string>) => z.string().trim().pipe(item);

/** Trimmed text, `1..200` characters. */
export const textItem = z.string().trim().min(1).max(REQUEST_LIMITS.shortText);

export const uuidItem = trimmed(z.uuid());

export const enumItem = <const T extends readonly [string, ...string[]]>(
  values: T
) => trimmed(z.enum(values));

/** A finite decimal number: digits with an optional sign and fraction. */
export const decimalItem = trimmed(
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, { message: 'Expected a decimal number' })
    .transform(Number)
    .pipe(z.number())
);

/** A month: a whole number from 1 to 12. */
export const monthItem = trimmed(
  z
    .string()
    .regex(/^([1-9]|1[0-2])$/, {
      message: 'Expected a whole number from 1 to 12'
    })
    .transform(Number)
);

// Single-value operators take one string; a repeated key (array) or a nested
// object (`eq[$ne]=x`) is a type error. A comma in `eq`/`has` hints at the
// list operator of the field.
const single = <T>(item: ItemSchema<T>) => z.string().pipe(item);

const singleWithoutComma = <T>(item: ItemSchema<T>, hint: string) =>
  z
    .string()
    .refine((value) => !value.includes(','), { message: hint })
    .pipe(item);

// A comma-separated string or a repeated key, as trimmed non-blank entries.
const listEntries = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    [value]
      .flat()
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );

// List operators take a comma-separated string or a repeated key. Entries are
// trimmed and blanks dropped; an invalid entry is reported at its index.
const list = <T>(item: ItemSchema<T>) =>
  listEntries.pipe(z.array(item).min(1).max(REQUEST_LIMITS.listItems));

// An operator of the wrong kind for the field: always rejected with a hint.
const hint = (message: string) => z.never({ error: message }).exactOptional();

// Exactly one operator (OpenAPI `minProperties`/`maxProperties: 1`). Skipped
// when the operators already failed, so an unknown operator reports only itself.
const oneOperator = <T extends z.ZodObject>(operators: T) =>
  operators
    .refine((value) => Object.keys(value).length === 1, {
      message: ONE_OPERATOR,
      when: (payload) => payload.issues.length === 0
    })
    .exactOptional();

// Scalar fields (text, identifier, enumerated) answer list operators with the
// `in` hint.
const scalarHints = {
  has: hint(USE_IN),
  hasAny: hint(USE_IN)
};

/** Text: `eq`, `in`, `contains`, `startsWith`, `endsWith`. */
export const textField = () =>
  oneOperator(
    z.object({
      eq: singleWithoutComma(textItem, USE_IN).exactOptional(),
      in: list(textItem).exactOptional(),
      contains: single(textItem).exactOptional(),
      startsWith: single(textItem).exactOptional(),
      endsWith: single(textItem).exactOptional(),
      ...scalarHints
    })
  );

/** Identifier (UUID): `eq`, `in`. */
export const identifierField = () =>
  oneOperator(
    z.object({
      eq: singleWithoutComma(uuidItem, USE_IN).exactOptional(),
      in: list(uuidItem).exactOptional(),
      ...scalarHints
    })
  );

/** One of the declared values: `eq`, `in`. */
export const enumField = <const T extends readonly [string, ...string[]]>(
  values: T
) =>
  oneOperator(
    z.object({
      eq: singleWithoutComma(enumItem(values), USE_IN).exactOptional(),
      in: list(enumItem(values)).exactOptional(),
      ...scalarHints
    })
  );

/** A list of `item`: `has` (one value is in the list), `hasAny`. */
export const listField = <T>(item: ItemSchema<T>) =>
  oneOperator(
    z.object({
      has: singleWithoutComma(item, USE_HAS_ANY).exactOptional(),
      hasAny: list(item).exactOptional(),
      in: hint(USE_HAS_ANY)
    })
  );

/** A numeric range matched against one value: `eq`. */
export const rangeField = () =>
  oneOperator(
    z.object({
      eq: single(decimalItem).exactOptional()
    })
  );

const sortDirectionSchema = z.enum(['asc', 'desc']);

const pageNumber = z
  .string()
  .regex(/^[1-9]\d*$/, { message: 'Expected a whole number greater than 0' })
  .transform(Number);

// Both values are always present in the output, so every listing pages.
const paginationSchema = z
  .object({
    page: pageNumber.pipe(z.int()).default(LIST_LIMITS.defaultPage),
    limit: pageNumber
      .pipe(z.int().max(LIST_LIMITS.maxPageSize))
      .default(LIST_LIMITS.defaultPageSize)
  })
  .prefault({});

type Names = readonly [string, ...string[]];

// A selection of declared names (fields, relations): same list syntax as the
// list operators. Names are case-sensitive and checked as a whole list, so the
// issue is reported at the parameter; the output holds each name once, in
// declared order, whatever the request order or repetition.
const selection = <const T extends Names>(names: T) => {
  const known = new Set<string>(names);

  return listEntries
    .pipe(z.array(z.string()).min(1).max(REQUEST_LIMITS.listItems))
    .refine((entries) => entries.every((entry) => known.has(entry)), {
      message: `Expected a comma-separated list of: ${names.join(', ')}`
    })
    .transform((entries): readonly T[number][] => {
      const selected = new Set(entries);

      return names.filter((name) => selected.has(name));
    });
};

/**
 * JSON:API sparse fieldset of the route's own resource type:
 * `fields[<type>]=a,b` → `['a', 'b']`. `id` is accepted and dropped (it is
 * always sent), so `fields[<type>]=id` gives `[]`. Any other type is an
 * unknown field once the schema is made strict.
 */
export const fieldsetSchema = <
  const Type extends string,
  const T extends Names
>(
  type: Type,
  names: T
) => {
  type Fields = readonly Exclude<T[number], 'id'>[];

  const fields = selection(names).transform((selected): Fields =>
    selected.filter((name): name is Exclude<T[number], 'id'> => name !== 'id')
  );

  return z
    .object({ [type]: fields } as Record<Type, typeof fields>)
    .transform((fieldset): Fields => (fieldset as Record<Type, Fields>)[type]);
};

/** JSON:API include: `include=a,b` → the declared relations named. */
export const includeSchema = <const T extends Names>(relations: T) =>
  selection(relations);

type SelectionCapabilities<F extends z.ZodType, I extends z.ZodType> = {
  fields?: F;
  include?: I;
};

type NoKeys = Record<never, never>;

type SelectionShape<F extends z.ZodType, I extends z.ZodType> = ([F] extends [
  never
]
  ? NoKeys
  : { fields: z.ZodExactOptional<F> }) &
  ([I] extends [never] ? NoKeys : { include: z.ZodExactOptional<I> });

// Only the declared parameters become keys: an undeclared `fields` or
// `include` stays an unknown field.
const selectionShape = <F extends z.ZodType, I extends z.ZodType>({
  fields,
  include
}: SelectionCapabilities<F, I>): SelectionShape<F, I> =>
  ({
    ...(fields && { fields: fields.exactOptional() }),
    ...(include && { include: include.exactOptional() })
  }) as SelectionShape<F, I>;

/**
 * `query` schema of a single read: only the declared `fields` / `include`.
 */
export const readQuerySchema = <
  F extends z.ZodType = never,
  I extends z.ZodType = never
>(
  capabilities: SelectionCapabilities<F, I>
) => z.object(selectionShape(capabilities));

type FilterShape = Record<string, z.ZodType>;

// `sort` with no key sorts nothing: it is left out of the output.
const withoutEmptySort = <Q>(query: Q): Q => {
  const { sort, ...rest } = query as { sort?: object };

  return sort === undefined || Object.keys(sort).length > 0
    ? query
    : (rest as Q);
};

type ListQueryCapabilities<
  F extends FilterShape,
  K extends readonly [string, ...string[]],
  FS extends z.ZodType,
  IS extends z.ZodType
> = SelectionCapabilities<FS, IS> & {
  filter: F;
  sortableKeys: K;
};

/**
 * Builds the `query` schema of a listing from the resource's filter fields
 * (built with the field helpers above), its sortable keys and, when declared,
 * its `fields` / `include` parameters. The output is
 * `{ filter?, sort?, pagination, fields?, include? }`; an empty `sort` is left
 * out.
 */
export const listQuerySchema = <
  F extends FilterShape,
  const K extends readonly [string, ...string[]],
  FS extends z.ZodType = never,
  IS extends z.ZodType = never
>({
  filter,
  sortableKeys,
  ...capabilities
}: ListQueryCapabilities<F, K, FS, IS>) =>
  z
    .object({
      filter: z.object(filter).exactOptional(),
      sort: z
        .partialRecord(z.enum(sortableKeys), sortDirectionSchema)
        .exactOptional(),
      pagination: paginationSchema,
      ...selectionShape(capabilities)
    })
    .transform(withoutEmptySort);
