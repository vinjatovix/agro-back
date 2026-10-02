import { z } from 'zod';

import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  emptyBody,
  emptyQuery,
  listSchema,
  requiredLongTextSchema,
  requiredShortTextSchema,
  trimmedLongTextSchema,
  trimmedShortTextSchema
} from '../../shared/requestSchemas.js';

// Required texts use the same schemas in create and update, so a PATCH cannot
// store what create rejects. Optional keys use `.exactOptional()` so the parsed
// body is assignable to the Family DTOs under `exactOptionalPropertyTypes`
// without casts.

/** A UUID is looked up by id; anything else by slug. Trimmed, `1..200`. */
const familyIdOrSlugParams = z.object({
  idOrSlug: requiredShortTextSchema
});

// Text lists: entries are trimmed here; blank entries and case-insensitive
// repeats are dropped by the domain (`uniqueTextList`), not rejected.

/** List ≤ 50 of trimmed strings ≤ 200. */
const aliasesSchema = listSchema(trimmedShortTextSchema);

/** List ≤ 50 of trimmed strings ≤ 200. */
const subfamiliesSchema = listSchema(trimmedShortTextSchema);

/** List ≤ 50 of trimmed strings ≤ 2000. */
const highlightsSchema = listSchema(trimmedLongTextSchema);

const speciesCountSchema = z.int().min(1);

// PATCH: `.nullable()` marks the optional fields that `null` removes; required
// fields keep rejecting `null`.
const clearable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().exactOptional();

// Create: `extra: null` → `400`; `extra: {}` is stored as absent by the domain.
const createFamilyBody = z.object({
  id: z.uuid(),
  slug: requiredShortTextSchema,
  name: requiredShortTextSchema,
  scientificName: requiredShortTextSchema,
  shortDescription: requiredLongTextSchema,
  highlights: highlightsSchema,
  aliases: aliasesSchema.exactOptional(),
  extra: z
    .object({
      order: requiredShortTextSchema.exactOptional(),
      distribution: requiredShortTextSchema.exactOptional(),
      speciesCount: speciesCountSchema.exactOptional(),
      subfamilies: subfamiliesSchema.exactOptional()
    })
    .exactOptional()
});

export const createFamilyRequest = {
  query: emptyQuery,
  body: createFamilyBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op), the version check still applies.
// `aliases` and `highlights` replace the stored list in full; only `extra` and
// its keys accept `null`.
const updateFamilyBody = z.object({
  slug: requiredShortTextSchema.exactOptional(),
  name: requiredShortTextSchema.exactOptional(),
  scientificName: requiredShortTextSchema.exactOptional(),
  shortDescription: requiredLongTextSchema.exactOptional(),
  aliases: aliasesSchema.exactOptional(),
  highlights: highlightsSchema.exactOptional(),
  extra: clearable(
    z.object({
      order: clearable(requiredShortTextSchema),
      distribution: clearable(requiredShortTextSchema),
      speciesCount: clearable(speciesCountSchema),
      subfamilies: clearable(subfamiliesSchema)
    })
  )
});

export const updateFamilyRequest = {
  params: familyIdOrSlugParams,
  query: emptyQuery,
  body: updateFamilyBody
} satisfies RequestSchemas;

export const getFamilyByIdOrSlugRequest = {
  params: familyIdOrSlugParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;
