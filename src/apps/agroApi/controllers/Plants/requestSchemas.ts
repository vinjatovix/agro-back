import { z } from 'zod';

import {
  PollinationType,
  SEASONS
} from '../../../../Contexts/Agro/Plants/domain/entities/types/index.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  boundedRecordSchema,
  emptyBody,
  emptyQuery,
  httpUrlSchema,
  listSchema,
  longTextSchema,
  partialRangeSchema,
  rangeSchema,
  REQUEST_LIMITS,
  requiredShortTextSchema,
  shortTextSchema,
  trimmedShortTextSchema
} from '../../shared/requestSchemas.js';

// Required labels (names, types, frequencies…) use `requiredShortTextSchema`
// in create and update alike, so a PATCH cannot store what create rejects.
// Optional keys use `.exactOptional()` so the parsed body is assignable to the
// Plant DTOs under `exactOptionalPropertyTypes` without casts.

const monthSchema = z.number().int().min(1).max(12);

const monthsSchema = z.array(monthSchema).max(12);

// Repeated or incompatible types are a domain rule (`Pollination`).
const pollinationTypesSchema = z
  .array(z.enum(PollinationType))
  .min(1)
  .max(Object.keys(PollinationType).length);

const lifecycleSchema = z.enum(['annual', 'biennial', 'perennial']);

const seasonsSchema = z.array(z.enum(SEASONS)).min(1).max(SEASONS.length);

const labelListSchema = listSchema(shortTextSchema);

const textListSchema = listSchema(longTextSchema);

// Method names become storage paths: camelCase letters only.
const camelCaseKeySchema = z
  .string()
  .max(REQUEST_LIMITS.recordKeyLength)
  .regex(/^[a-z][a-zA-Z]*$/, { message: 'Method name must be camelCase' });

// Empty aliases are dropped by the domain, not rejected.
const aliasesSchema = listSchema(trimmedShortTextSchema);

// Optional, but never blank when sent.
const harvestDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(REQUEST_LIMITS.longText);

const pruningItemSchema = z.object({
  type: requiredShortTextSchema,
  intensity: requiredShortTextSchema,
  seasons: seasonsSchema,
  frequencyPerYear: z.number(),
  bestPractices: textListSchema.exactOptional()
});

const resourceItemSchema = z.object({
  type: requiredShortTextSchema,
  url: httpUrlSchema,
  title: shortTextSchema.exactOptional(),
  source: shortTextSchema.exactOptional(),
  tags: labelListSchema.exactOptional()
});

const ecologySchema = z.object({
  strategicBenefits: textListSchema.exactOptional()
});

const propagationMethodSchema = z.object({
  seasons: seasonsSchema.exactOptional(),
  estimatedTimeWeeks: rangeSchema.exactOptional(),
  bestPractices: textListSchema.exactOptional()
});

// PATCH: `.nullable()` marks the optional fields that `null` removes; required
// fields keep rejecting `null`.
const clearable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().exactOptional();

const propagationMethodChangesSchema = z
  .object({
    seasons: clearable(seasonsSchema),
    estimatedTimeWeeks: clearable(partialRangeSchema),
    bestPractices: clearable(textListSchema)
  })
  .nullable();

const plantIdParams = z.object({
  id: z.uuid()
});

const createPlantBody = z.object({
  id: z.uuid(),
  identity: z.object({
    name: z.object({
      primary: requiredShortTextSchema,
      aliases: aliasesSchema.exactOptional()
    }),
    scientificName: requiredShortTextSchema,
    family: requiredShortTextSchema
  }),
  traits: z.object({
    lifecycle: lifecycleSchema,
    size: z.object({
      height: rangeSchema,
      spread: rangeSchema
    }),
    spacingCm: rangeSchema
  }),
  phenology: z.object({
    sowing: z.object({
      months: monthsSchema.min(1),
      seedsPerHole: rangeSchema,
      germinationDays: rangeSchema,
      methods: z.object({
        direct: z.object({ depthCm: rangeSchema }),
        starter: z.object({ depthCm: rangeSchema }).exactOptional()
      })
    }),
    // Every plant is sown, but not every plant flowers or is harvested: those
    // sections are optional, and their months may be empty.
    flowering: z
      .object({
        months: monthsSchema,
        pollination: z
          .object({
            types: pollinationTypesSchema,
            agents: labelListSchema.exactOptional()
          })
          .exactOptional()
      })
      .exactOptional(),
    harvest: z
      .object({
        months: monthsSchema,
        description: harvestDescriptionSchema.exactOptional()
      })
      .exactOptional()
  }),
  knowledge: z.object({
    rootSystem: z.object({
      type: requiredShortTextSchema,
      depthCm: rangeSchema,
      spreadCm: rangeSchema
    }),
    soil: z.object({
      ph: rangeSchema,
      availableDepthCm: rangeSchema
    }),
    light: z.object({
      hoursMin: z.number(),
      type: requiredShortTextSchema,
      preference: shortTextSchema.exactOptional()
    }),
    propagation: z.object({
      methods: boundedRecordSchema(camelCaseKeySchema, propagationMethodSchema)
    }),
    watering: z
      .object({
        frequency: requiredShortTextSchema,
        conditions: textListSchema.exactOptional()
      })
      .exactOptional(),
    pruning: listSchema(pruningItemSchema).exactOptional(),
    ecology: ecologySchema.exactOptional(),
    resources: listSchema(resourceItemSchema).exactOptional(),
    notes: textListSchema.exactOptional()
  })
});

export const createPlantRequest = {
  query: emptyQuery,
  body: createPlantBody
} satisfies RequestSchemas;

// An empty patch `{}` is a no-op (RFC 7396): the version check still applies.
const updatePlantBody = z.object({
  identity: z
    .object({
      name: z
        .object({
          primary: requiredShortTextSchema.exactOptional(),
          aliases: clearable(aliasesSchema)
        })
        .exactOptional(),
      scientificName: requiredShortTextSchema.exactOptional(),
      family: requiredShortTextSchema.exactOptional()
    })
    .exactOptional(),
  traits: z
    .object({
      lifecycle: lifecycleSchema.exactOptional(),
      size: z
        .object({
          height: partialRangeSchema.exactOptional(),
          spread: partialRangeSchema.exactOptional()
        })
        .exactOptional(),
      spacingCm: partialRangeSchema.exactOptional()
    })
    .exactOptional(),
  phenology: z
    .object({
      sowing: z
        .object({
          months: monthsSchema.min(1).exactOptional(),
          seedsPerHole: partialRangeSchema.exactOptional(),
          germinationDays: partialRangeSchema.exactOptional(),
          methods: z
            .object({
              direct: z
                .object({ depthCm: partialRangeSchema.exactOptional() })
                .exactOptional(),
              starter: clearable(
                z.object({ depthCm: partialRangeSchema.exactOptional() })
              )
            })
            .exactOptional()
        })
        .exactOptional(),
      // `types` is optional here: it replaces the stored list, and the domain
      // rejects a new pollination without one.
      flowering: z
        .object({
          months: monthsSchema.exactOptional(),
          pollination: clearable(
            z.object({
              types: pollinationTypesSchema.exactOptional(),
              agents: clearable(labelListSchema)
            })
          )
        })
        .exactOptional(),
      harvest: z
        .object({
          months: monthsSchema.exactOptional(),
          description: clearable(harvestDescriptionSchema)
        })
        .exactOptional()
    })
    .exactOptional(),
  knowledge: z
    .object({
      rootSystem: z
        .object({
          type: requiredShortTextSchema.exactOptional(),
          depthCm: partialRangeSchema.exactOptional(),
          spreadCm: partialRangeSchema.exactOptional()
        })
        .exactOptional(),
      soil: z
        .object({
          ph: partialRangeSchema.exactOptional(),
          availableDepthCm: partialRangeSchema.exactOptional()
        })
        .exactOptional(),
      light: z
        .object({
          hoursMin: z.number().exactOptional(),
          type: requiredShortTextSchema.exactOptional(),
          preference: clearable(shortTextSchema)
        })
        .exactOptional(),
      propagation: z
        .object({
          methods: boundedRecordSchema(
            camelCaseKeySchema,
            propagationMethodChangesSchema
          ).exactOptional()
        })
        .exactOptional(),
      watering: clearable(
        z.object({
          frequency: requiredShortTextSchema.exactOptional(),
          conditions: clearable(textListSchema)
        })
      ),
      pruning: clearable(listSchema(pruningItemSchema)),
      ecology: clearable(
        z.object({ strategicBenefits: clearable(textListSchema) })
      ),
      resources: clearable(listSchema(resourceItemSchema)),
      notes: clearable(textListSchema)
    })
    .exactOptional()
});

export const updatePlantRequest = {
  params: plantIdParams,
  query: emptyQuery,
  body: updatePlantBody
} satisfies RequestSchemas;

export const getPlantByIdRequest = {
  params: plantIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const deletePlantRequest = {
  params: plantIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;
