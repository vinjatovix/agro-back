import { z } from 'zod';

import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  emptyBody,
  emptyQuery,
  requiredShortTextSchema
} from '../../shared/requestSchemas.js';

// Optional keys use `.exactOptional()` so the parsed body is assignable to the
// Bed DTOs under `exactOptionalPropertyTypes` without casts. The owner comes
// from the session and plant instances change through their own operations:
// neither is accepted here.

const bedIdParams = z.object({
  id: z.uuid()
});

/** A JSON number above zero; numeric strings, `Infinity` and `NaN` rejected. */
const dimensionSchema = z.number().positive();

const createBedBody = z.object({
  id: z.uuid(),
  name: requiredShortTextSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  depth: dimensionSchema
});

export const createBedRequest = {
  query: emptyQuery,
  body: createBedBody
} satisfies RequestSchemas;

export const listBedsRequest = {
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const getBedByIdRequest = {
  params: bedIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op), the version check still applies.
// Every field is required on the bed, so none accepts `null`.
const updateBedBody = z.object({
  name: requiredShortTextSchema.exactOptional(),
  width: dimensionSchema.exactOptional(),
  height: dimensionSchema.exactOptional(),
  depth: dimensionSchema.exactOptional()
});

export const updateBedRequest = {
  params: bedIdParams,
  query: emptyQuery,
  body: updateBedBody
} satisfies RequestSchemas;

export const deleteBedRequest = {
  params: bedIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;
