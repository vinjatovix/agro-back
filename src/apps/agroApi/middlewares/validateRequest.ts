import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { createError } from '../../../shared/errors/index.js';

import {
  strictifySchema,
  zodIssuesToErrors,
  type PartIssues,
  type RequestPart
} from './helpers/index.js';

export type RequestSchemas = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
};

// Declare route schemas with `satisfies RequestSchemas`, not `: RequestSchemas`:
// the annotation widens every part to optional, so this type becomes `{}`.
export type ValidatedRequest<S extends RequestSchemas> = {
  [K in keyof S as S[K] extends z.ZodType ? K : never]: S[K] extends z.ZodType
    ? z.output<S[K]>
    : never;
};

type DeclaredPart = {
  part: RequestPart;
  source: z.ZodType;
  schema: z.ZodType;
};

type ParsedPart = {
  part: RequestPart;
  source: z.ZodType;
  result: z.ZodSafeParseResult<unknown>;
};

type StoredPart = {
  source: z.ZodType;
  data: unknown;
};

type StoredParts = Partial<Record<RequestPart, StoredPart>>;

const VALIDATION_ERROR_MESSAGE = 'Validation error';

const REQUEST_PARTS: ReadonlyArray<RequestPart> = ['params', 'query', 'body'];

// Express only yields declared path params, so `params` is never strictified.
const STRICT_PARTS: ReadonlySet<RequestPart> = new Set(['query', 'body']);

// Each part's parsed output next to the schema given for it, so
// `getValidatedRequest` can check it is asked for the same one and its output
// type matches the stored data. Private, so no other code can replace it.
const validated = new WeakMap<Response, StoredParts>();

const declareParts = (schemas: RequestSchemas): DeclaredPart[] =>
  REQUEST_PARTS.flatMap((part) => {
    const schema = schemas[part];
    if (schema === undefined) return [];

    return [
      {
        part,
        source: schema,
        schema: STRICT_PARTS.has(part) ? strictifySchema(schema) : schema
      }
    ];
  });

const toFailures = (parsed: ReadonlyArray<ParsedPart>): PartIssues[] =>
  parsed.flatMap(({ part, result }) =>
    result.success ? [] : [{ part, issues: result.error.issues }]
  );

const toStored = (parsed: ReadonlyArray<ParsedPart>): StoredParts =>
  Object.fromEntries(
    parsed.map(({ part, source, result }) => [
      part,
      { source, data: result.data }
    ])
  );

/**
 * Validates the declared request parts (params → query → body) with Zod.
 * Query and body schemas are made strict at any depth once, here, at route
 * registration, which also fails if no part is declared. On success the parsed outputs are merged into those of any
 * earlier step and kept for `getValidatedRequest`; `req.*` is never modified.
 */
export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  const declared = declareParts(schemas);
  if (declared.length === 0) {
    throw createError.internal(
      'validateRequest: declare at least one of params, query or body'
    );
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const parsed = await Promise.all(
      declared.map(async ({ part, source, schema }): Promise<ParsedPart> => ({
        part,
        source,
        result: await schema.safeParseAsync(req[part])
      }))
    );

    const failures = toFailures(parsed);
    if (failures.length > 0) {
      throw createError.badRequest(
        VALIDATION_ERROR_MESSAGE,
        zodIssuesToErrors(failures)
      );
    }

    // Merge so a router-level and a route-level step can both contribute;
    // when both declare the same part, the later one wins.
    validated.set(res, {
      ...validated.get(res),
      ...toStored(parsed)
    });
    next();
  };
};

/**
 * Reads the outputs kept by `validateRequest`. Pass the same schemas object
 * given to `validateRequest` on the route: it types the result and every part
 * it declares is checked to have been validated with that same schema.
 */
export const getValidatedRequest = <S extends RequestSchemas>(
  res: Response,
  schemas: S
): ValidatedRequest<S> => {
  const stored = validated.get(res);

  if (stored === undefined) {
    throw createError.internal(
      'validated request missing: validateRequest is not registered on this route'
    );
  }

  const declared = REQUEST_PARTS.filter((part) => schemas[part] !== undefined);
  const unmatched = declared.filter(
    (part) => stored[part]?.source !== schemas[part]
  );
  if (unmatched.length > 0) {
    throw createError.internal(
      `validated request parts not validated with these schemas: ${unmatched.join(', ')}`
    );
  }

  // Every part declared in `schemas` was parsed by that schema and stored.
  return Object.fromEntries(
    declared.map((part) => [part, stored[part]?.data])
  ) as ValidatedRequest<S>;
};
