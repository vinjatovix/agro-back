import { z } from 'zod';

import { REQUEST_LIMITS } from './requestSchemas.js';

// Building blocks of the response schemas (output check). Unlike the request
// schemas they never transform a value: no trimming, so the body sent is the
// stored data, unchanged.

const NOT_BLANK = /\S/;

/** OpenAPI `RequiredShortText`: never blank, checked as stored. */
export const requiredShortTextResponseSchema = z
  .string()
  .min(1)
  .max(REQUEST_LIMITS.shortText)
  .regex(NOT_BLANK);

/** OpenAPI `RequiredLongText`: never blank, checked as stored. */
export const requiredLongTextResponseSchema = z
  .string()
  .min(1)
  .max(REQUEST_LIMITS.longText)
  .regex(NOT_BLANK);

/** OpenAPI `Metadata`: dates are sent as ISO strings by `res.json`. */
export const metadataResponseSchema = z.object({
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  updatedBy: z.string()
});
