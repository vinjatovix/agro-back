import { z } from 'zod';

import {
  PollinationType,
  SEASONS
} from '../../../../Contexts/Agro/Plants/domain/entities/types/index.js';
import {
  listSchema,
  longTextSchema,
  rangeSchema,
  REQUEST_LIMITS,
  shortTextSchema
} from '../../shared/requestSchemas.js';
import {
  metadataResponseSchema,
  requiredLongTextResponseSchema,
  requiredShortTextResponseSchema
} from '../../shared/responseSchemas.js';
import { familyResponseSchema } from '../Families/responseSchemas.js';

// Output check of the plant read path: mirrors the OpenAPI `Plant` schema.
// `z.object` strips unknown keys at any depth; a missing or mistyped contract
// field fails. Nothing here transforms a value (no trimming), so the stored
// data is sent exactly as stored.

/** The plain family id a plant points to: required short text, not a UUID. */
export const familyIdSchema = z.string().min(1).max(REQUEST_LIMITS.shortText);

/** The embedded family relation: `id`, `name` and `slug`, nothing else. */
export const familySummarySchema = familyResponseSchema.pick({
  id: true,
  name: true,
  slug: true
});

/** OpenAPI `PlantIdentityView.family`: the id, or the family summary. */
export const plantFamilySchema = z.union([familyIdSchema, familySummarySchema]);

const monthsSchema = z.array(z.number().int().min(1).max(12)).max(12);

const seasonsSchema = z.array(z.enum(SEASONS)).min(1).max(SEASONS.length);

const labelListSchema = listSchema(shortTextSchema);

const textListSchema = listSchema(longTextSchema);

const sowingMethodSchema = z.object({ depthCm: rangeSchema });

const identitySchema = z.object({
  name: z.object({
    primary: requiredShortTextResponseSchema,
    aliases: labelListSchema.exactOptional()
  }),
  scientificName: requiredShortTextResponseSchema,
  family: plantFamilySchema
});

const traitsSchema = z.object({
  lifecycle: z.enum(['annual', 'biennial', 'perennial']),
  size: z.object({ height: rangeSchema, spread: rangeSchema }),
  spacingCm: rangeSchema
});

const phenologySchema = z.object({
  sowing: z.object({
    months: monthsSchema.min(1),
    seedsPerHole: rangeSchema,
    germinationDays: rangeSchema,
    methods: z.object({
      direct: sowingMethodSchema,
      starter: sowingMethodSchema.exactOptional()
    })
  }),
  flowering: z.object({
    months: monthsSchema,
    pollination: z
      .object({
        types: z
          .array(z.enum(PollinationType))
          .min(1)
          .max(Object.keys(PollinationType).length),
        agents: labelListSchema.exactOptional()
      })
      .exactOptional()
  }),
  harvest: z.object({
    months: monthsSchema,
    description: requiredLongTextResponseSchema.exactOptional()
  })
});

const knowledgeSchema = z.object({
  soil: z
    .object({ ph: rangeSchema, availableDepthCm: rangeSchema })
    .exactOptional(),
  rootSystem: z
    .object({
      type: requiredShortTextResponseSchema,
      depthCm: rangeSchema,
      spreadCm: rangeSchema
    })
    .exactOptional(),
  watering: z
    .object({
      frequency: requiredShortTextResponseSchema,
      conditions: textListSchema.exactOptional()
    })
    .exactOptional(),
  light: z
    .object({
      hoursMin: z.number().min(0).max(24),
      type: requiredShortTextResponseSchema,
      preference: shortTextSchema.exactOptional()
    })
    .exactOptional(),
  pruning: listSchema(
    z.object({
      type: requiredShortTextResponseSchema,
      intensity: requiredShortTextResponseSchema,
      seasons: seasonsSchema,
      frequencyPerYear: z.number().positive(),
      bestPractices: textListSchema.exactOptional()
    })
  ).exactOptional(),
  propagation: z
    .object({
      methods: z.record(
        z.string().max(REQUEST_LIMITS.recordKeyLength),
        z.object({
          seasons: seasonsSchema.exactOptional(),
          estimatedTimeWeeks: rangeSchema.exactOptional(),
          bestPractices: textListSchema.exactOptional()
        })
      )
    })
    .exactOptional(),
  ecology: z
    .object({ strategicBenefits: textListSchema.exactOptional() })
    .exactOptional(),
  resources: listSchema(
    z.object({
      type: requiredShortTextResponseSchema,
      url: z
        .string()
        .max(REQUEST_LIMITS.url)
        .regex(/^https?:\/\//),
      title: shortTextSchema.exactOptional(),
      source: shortTextSchema.exactOptional(),
      tags: labelListSchema.exactOptional()
    })
  ).exactOptional(),
  notes: textListSchema.exactOptional()
});

export const plantResponseSchema = z.object({
  id: z.string().min(1).max(REQUEST_LIMITS.shortText),
  version: z.number().int().min(0),
  identity: identitySchema,
  traits: traitsSchema,
  phenology: phenologySchema,
  knowledge: knowledgeSchema,
  metadata: metadataResponseSchema,
  status: z.enum(['ACTIVE', 'DELETED']),
  deletedAt: z.iso.datetime().nullable()
});

export type PlantResponse = z.output<typeof plantResponseSchema>;
