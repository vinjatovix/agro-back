import { z } from 'zod';

// Declared as `query` on routes that take no query string: the validation step
// makes it strict, so any key is reported as an unknown field.
export const emptyQuery = z.object({});

// Declared as `body` on GET routes: Express 5 leaves `req.body` undefined when
// no body is sent, so a missing body passes and any field is unknown.
export const emptyBody = z.object({}).optional();

// Range rules (bounds order, no negatives) belong to the domain `Range`: only
// the shape is checked here.
export const rangeSchema = z.object({
  min: z.number(),
  max: z.number()
});

// PATCH interval: either bound may be sent alone, merged by the domain.
export const partialRangeSchema = z.object({
  min: z.number().exactOptional(),
  max: z.number().exactOptional()
});

// Size limits keep stored documents and responses bounded. They are transport
// limits, not business rules, and are published in the OpenAPI contract.
export const REQUEST_LIMITS = {
  shortText: 200,
  longText: 2000,
  url: 2048,
  listItems: 50,
  recordKeys: 20,
  recordKeyLength: 50
} as const;

/** A label, name or type: a short line of text. */
export const shortTextSchema = z.string().max(REQUEST_LIMITS.shortText);

/** A label trimmed before its length is checked: padding does not count. */
export const trimmedShortTextSchema = z
  .string()
  .trim()
  .max(REQUEST_LIMITS.shortText);

/** A required label: trimmed and never blank. */
export const requiredShortTextSchema = trimmedShortTextSchema.min(1);

/** Free text, such as a note or a description. */
export const longTextSchema = z.string().max(REQUEST_LIMITS.longText);

/** A bounded list of `item`. */
export const listSchema = <T extends z.ZodType>(item: T) =>
  z.array(item).max(REQUEST_LIMITS.listItems);

/** An absolute `http(s)` URL; other schemes (`javascript:`…) are rejected. */
export const httpUrlSchema = z
  .url({ protocol: /^https?$/, hostname: z.regexes.domain })
  .max(REQUEST_LIMITS.url);

/** A record with at most `REQUEST_LIMITS.recordKeys` keys. */
export const boundedRecordSchema = <
  K extends z.core.$ZodRecordKey,
  V extends z.ZodType
>(
  key: K,
  value: V
) =>
  z
    .record(key, value)
    .refine(
      (record) => Object.keys(record).length <= REQUEST_LIMITS.recordKeys,
      {
        message: `Too many entries: at most ${REQUEST_LIMITS.recordKeys}`
      }
    );
