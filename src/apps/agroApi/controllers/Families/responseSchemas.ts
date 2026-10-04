import { z } from 'zod';

import type { FamilyField } from '../../../../Contexts/Agro/Families/application/queries/index.js';
import {
  listSchema,
  longTextSchema,
  REQUEST_LIMITS,
  shortTextSchema
} from '../../shared/requestSchemas.js';
import {
  fieldsetMask,
  metadataResponseSchema,
  requiredLongTextResponseSchema,
  requiredShortTextResponseSchema
} from '../../shared/responseSchemas.js';

// Output check of the family read path: mirrors the OpenAPI `Family` schema.
// `z.object` strips unknown keys at any depth; a missing or mistyped contract
// field fails. Nothing here transforms a value (no trimming).

const extraSchema = z.object({
  order: requiredShortTextResponseSchema.exactOptional(),
  distribution: requiredShortTextResponseSchema.exactOptional(),
  speciesCount: z.number().int().min(1).exactOptional(),
  subfamilies: listSchema(shortTextSchema).exactOptional()
});

export const familyResponseSchema = z.object({
  // Stored ids are short texts, not always UUIDs.
  id: z.string().min(1).max(REQUEST_LIMITS.shortText),
  version: z.number().int().min(0),
  slug: requiredShortTextResponseSchema,
  name: requiredShortTextResponseSchema,
  scientificName: requiredShortTextResponseSchema,
  shortDescription: requiredLongTextResponseSchema,
  aliases: listSchema(shortTextSchema),
  highlights: listSchema(longTextSchema),
  extra: extraSchema.exactOptional(),
  metadata: metadataResponseSchema
});

export type FamilyResponse = z.output<typeof familyResponseSchema>;

/** A family read with `fields[families]`: `id` plus any requested fields. */
export type FamilyFieldsetResponse = Pick<FamilyResponse, 'id'> &
  Partial<Omit<FamilyResponse, 'id'>>;

/**
 * Output check of a family read: the full schema without a fieldset, or only
 * `id` and the requested fields, each with its full contract shape.
 */
export const familyFieldsetResponseSchema = (
  fields?: readonly FamilyField[]
): z.ZodType<FamilyFieldsetResponse> =>
  fields === undefined
    ? familyResponseSchema
    : familyResponseSchema.pick(fieldsetMask(fields));
