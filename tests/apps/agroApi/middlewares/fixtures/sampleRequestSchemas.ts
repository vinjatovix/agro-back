import { z } from 'zod';

import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';

export const DEFAULT_PAGE = 1;
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match';
export const PASSWORD_DIGIT_MESSAGE = 'Password needs a digit';

export const sampleParamsSchema = () => z.object({ id: z.uuid() });

export const sampleQuerySchema = () =>
  z.object({
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(DEFAULT_PAGE)
  });

export const sampleBodySchema = () =>
  z
    .object({
      identity: z.object({
        name: z.object({ primary: z.string() })
      }),
      tags: z.array(z.string()),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH)
        .regex(/\d/, { message: PASSWORD_DIGIT_MESSAGE }),
      passwordConfirmation: z.string().optional()
    })
    .refine(
      ({ password, passwordConfirmation }) =>
        passwordConfirmation === undefined || password === passwordConfirmation,
      { message: PASSWORD_MISMATCH_MESSAGE, path: ['passwordConfirmation'] }
    );

export const sampleRequestSchemas = () =>
  ({
    params: sampleParamsSchema(),
    query: sampleQuerySchema(),
    body: sampleBodySchema()
  }) satisfies RequestSchemas;

/** Pattern whose source must never reach a response. */
export const SAMPLE_CODE_PATTERN = /^[a-z]{3}-\d{4}$/;

/** `code` checked with `.regex()` and Zod's native message. */
export const nativeRegexMessageSchema = () =>
  z.object({ code: z.string().regex(SAMPLE_CODE_PATTERN) });

/** `code` checked with `.regex()` and a custom message that prints the pattern. */
export const leakyRegexMessageSchema = () =>
  z.object({
    code: z.string().regex(SAMPLE_CODE_PATTERN, {
      message: `Code must look like ${String(SAMPLE_CODE_PATTERN)}`
    })
  });

/** Rejects every key; used to produce many `unrecognized_keys` entries. */
export const emptyStrictSchema = () => z.strictObject({});

/** Any string key mapped to a number; used to produce many distinct keys. */
export const numberRecordSchema = () => z.record(z.string(), z.number());

/** Builds an object whose keys are `keys`, all holding `value`. */
export const objectWithKeys = (
  keys: ReadonlyArray<string>,
  value: unknown = 1
): Record<string, unknown> =>
  Object.fromEntries(keys.map((key) => [key, value]));

/** `count` distinct field names with the given prefix. */
export const fieldNames = (count: number, prefix = 'field'): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`);

export type SampleRequestSchemas = ReturnType<typeof sampleRequestSchemas>;

export type SampleBody = z.input<ReturnType<typeof sampleBodySchema>>;

export const sampleValidParams = (): { id: string } => ({ id: random.uuid() });

export const sampleValidQuery = (): Record<string, string> => ({
  limit: '10'
});

export const sampleValidBody = (overrides: Partial<SampleBody> = {}) => ({
  identity: { name: { primary: random.word({ min: 3, max: 12 }) } },
  tags: [random.word({ min: 1, max: 8 }), random.word({ min: 1, max: 8 })],
  password: `${random.word({ min: 4, max: 8 })}-secret-1234`,
  ...overrides
});
