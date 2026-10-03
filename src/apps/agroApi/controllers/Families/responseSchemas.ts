import { z } from 'zod';

import {
  listSchema,
  longTextSchema,
  REQUEST_LIMITS,
  shortTextSchema
} from '../../shared/requestSchemas.js';
import {
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
