import type { z } from 'zod';

import { zodIssuesToErrors } from '../../../../../src/apps/agroApi/middlewares/helpers/zodIssuesToErrors.js';

import {
  emptyStrictSchema,
  fieldNames,
  leakyRegexMessageSchema,
  nativeRegexMessageSchema,
  numberRecordSchema,
  objectWithKeys,
  PASSWORD_DIGIT_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  SAMPLE_CODE_PATTERN,
  sampleBodySchema,
  sampleParamsSchema,
  sampleQuerySchema,
  sampleValidBody
} from '../fixtures/sampleRequestSchemas.js';
import {
  INVALID_FORMAT_MESSAGE,
  KEY_ELLIPSIS,
  MAX_ERROR_KEY_LENGTH,
  MAX_FIELD_ERRORS,
  TRUNCATED_ERROR_KEY,
  UNKNOWN_FIELD_MESSAGE
} from '../fixtures/validationErrorContract.js';

const issuesOf = (
  schema: z.ZodType,
  input: unknown,
  { reportInput = false }: { reportInput?: boolean } = {}
): ReadonlyArray<z.core.$ZodIssue> => {
  const result = schema.safeParse(input, { reportInput });

  expect(result.success).toBe(false);

  return result.error?.issues ?? [];
};

const unknownKeysIssues = (keys: ReadonlyArray<string>) =>
  issuesOf(emptyStrictSchema(), objectWithKeys(keys));

describe('zodIssuesToErrors', () => {
  describe('keys', () => {
    it('should join nested paths with dots', () => {
      const issues = issuesOf(sampleBodySchema(), {
        ...sampleValidBody(),
        identity: { name: {} }
      });

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors)).toEqual(['identity.name.primary']);
    });

    it('should write array indexes as numbers', () => {
      const issues = issuesOf(sampleBodySchema(), {
        ...sampleValidBody(),
        tags: ['ok', 12345]
      });

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(errors).toHaveProperty(['tags.1']);
    });

    it('should not prefix keys with the request part', () => {
      const issues = issuesOf(sampleParamsSchema(), { id: 'abc' });

      const errors = zodIssuesToErrors([{ part: 'params', issues }]);

      expect(Object.keys(errors)).toEqual(['id']);
    });

    it.each(['params', 'query', 'body'] as const)(
      'should use the part name %p when the part root is wrong',
      (part) => {
        const issues = issuesOf(sampleBodySchema(), undefined);

        const errors = zodIssuesToErrors([{ part, issues }]);

        expect(Object.keys(errors)).toEqual([part]);
      }
    );
  });

  describe('messages', () => {
    it('should add one Unknown field entry per unrecognized key', () => {
      const issues = unknownKeysIssues(['foo', 'bar']);

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(errors).toEqual({
        foo: UNKNOWN_FIELD_MESSAGE,
        bar: UNKNOWN_FIELD_MESSAGE
      });
    });

    it('should keep the schema message for other issues', () => {
      const issues = issuesOf(sampleParamsSchema(), { id: 'abc' });

      const errors = zodIssuesToErrors([{ part: 'params', issues }]);

      expect(errors.id).toBe(issues[0]?.message);
    });

    it('should return custom schema messages as they are', () => {
      const body = sampleValidBody();
      const issues = issuesOf(sampleBodySchema(), {
        ...body,
        passwordConfirmation: `${body.password}-different`
      });

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(errors.passwordConfirmation).toBe(PASSWORD_MISMATCH_MESSAGE);
    });

    it('should keep the first message when a key fails twice', () => {
      const issues = issuesOf(sampleBodySchema(), {
        ...sampleValidBody(),
        password: 'abc'
      });
      const passwordIssues = issues.filter(
        (issue) => issue.path.join('.') === 'password'
      );

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(passwordIssues.length).toBeGreaterThan(1);
      expect(errors.password).toBe(passwordIssues[0]?.message);
    });

    it('should let params beat query and query beat body for the same key', () => {
      const paramsIssues = issuesOf(sampleParamsSchema(), { id: 'abc' });
      const queryIssues = issuesOf(sampleParamsSchema(), {});
      const bodyIssues = unknownKeysIssues(['id', 'limit']);
      const queryLimitIssues = issuesOf(sampleQuerySchema(), { limit: 'x' });

      const errors = zodIssuesToErrors([
        { part: 'params', issues: paramsIssues },
        { part: 'query', issues: [...queryIssues, ...queryLimitIssues] },
        { part: 'body', issues: bodyIssues }
      ]);

      expect(errors.id).toBe(paramsIssues[0]?.message);
      expect(errors.limit).toBe(queryLimitIssues[0]?.message);
    });
  });

  describe('limits', () => {
    it('should keep exactly the maximum number of fields and add _truncated', () => {
      const issues = unknownKeysIssues(fieldNames(MAX_FIELD_ERRORS + 5));

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors)).toHaveLength(MAX_FIELD_ERRORS + 1);
      expect(errors[TRUNCATED_ERROR_KEY]).toEqual(expect.any(String));
      expect(errors[TRUNCATED_ERROR_KEY]).not.toBe(UNKNOWN_FIELD_MESSAGE);
    });

    it('should count distinct keys from ordinary issues too', () => {
      const issues = issuesOf(
        numberRecordSchema(),
        objectWithKeys(fieldNames(MAX_FIELD_ERRORS + 1), 'not-a-number')
      );

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors)).toHaveLength(MAX_FIELD_ERRORS + 1);
      expect(errors).toHaveProperty([TRUNCATED_ERROR_KEY]);
    });

    it('should not add _truncated with exactly the maximum number of keys', () => {
      const issues = unknownKeysIssues(fieldNames(MAX_FIELD_ERRORS));

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors)).toHaveLength(MAX_FIELD_ERRORS);
      expect(errors).not.toHaveProperty([TRUNCATED_ERROR_KEY]);
    });

    it('should overwrite a client key named _truncated when truncating', () => {
      const issues = unknownKeysIssues([
        TRUNCATED_ERROR_KEY,
        ...fieldNames(MAX_FIELD_ERRORS + 5)
      ]);

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors).length).toBeLessThanOrEqual(
        MAX_FIELD_ERRORS + 1
      );
      expect(errors[TRUNCATED_ERROR_KEY]).toEqual(expect.any(String));
      expect(errors[TRUNCATED_ERROR_KEY]).not.toBe(UNKNOWN_FIELD_MESSAGE);
    });

    it('should cut long keys to the maximum length ending in an ellipsis', () => {
      const longKey = 'k'.repeat(MAX_ERROR_KEY_LENGTH * 2);
      const issues = unknownKeysIssues([longKey]);

      const [key] = Object.keys(zodIssuesToErrors([{ part: 'body', issues }]));

      expect(Array.from(key ?? '')).toHaveLength(MAX_ERROR_KEY_LENGTH);
      expect(key?.endsWith(KEY_ELLIPSIS)).toBe(true);
      expect(longKey.startsWith(key?.slice(0, -1) ?? '-')).toBe(true);
    });

    it('should never split a surrogate pair when cutting a key', () => {
      const emoji = '😀';
      const issues = unknownKeysIssues([emoji.repeat(MAX_ERROR_KEY_LENGTH)]);

      const [key] = Object.keys(zodIssuesToErrors([{ part: 'body', issues }]));
      const codePoints = Array.from(key ?? '');

      expect(codePoints).toHaveLength(MAX_ERROR_KEY_LENGTH);
      expect(codePoints.slice(0, -1).every((char) => char === emoji)).toBe(
        true
      );
    });

    it('should keep the first entry when two keys are equal after cutting', () => {
      const prefix = 'p'.repeat(MAX_ERROR_KEY_LENGTH);
      const issues = unknownKeysIssues([`${prefix}-first`, `${prefix}-second`]);

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(Object.keys(errors)).toHaveLength(1);
    });
  });

  describe('safety', () => {
    it('should never write unknown key names into messages', () => {
      const names = fieldNames(MAX_FIELD_ERRORS + 5, 'secret-name-');
      const issues = unknownKeysIssues(names);

      const messages = Object.values(
        zodIssuesToErrors([{ part: 'body', issues }])
      );

      for (const name of names) {
        expect(messages.some((message) => message.includes(name))).toBe(false);
      }
    });

    it('should not copy the native unrecognized_keys message', () => {
      const issues = unknownKeysIssues(['leaky-key']);

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(issues[0]?.message).toContain('leaky-key');
      expect(errors['leaky-key']).toBe(UNKNOWN_FIELD_MESSAGE);
    });

    it.each([
      ['native', nativeRegexMessageSchema],
      ['custom', leakyRegexMessageSchema]
    ])(
      'should replace a %s regex message that prints the pattern',
      (_case, schema) => {
        const issues = issuesOf(schema(), { code: 'not-a-code' });

        const errors = zodIssuesToErrors([{ part: 'body', issues }]);

        expect(issues[0]?.message).toContain(SAMPLE_CODE_PATTERN.source);
        expect(errors).toEqual({ code: INVALID_FORMAT_MESSAGE });
      }
    );

    it('should keep a custom regex message that hides the pattern', () => {
      const issues = issuesOf(sampleBodySchema(), {
        ...sampleValidBody(),
        password: 'no-digits-here'
      });

      const errors = zodIssuesToErrors([{ part: 'body', issues }]);

      expect(errors.password).toBe(PASSWORD_DIGIT_MESSAGE);
    });

    it('should give the same output whether issue.input is present or not', () => {
      const body = { ...sampleValidBody(), tags: ['ok', 12345] };
      const issues = issuesOf(sampleBodySchema(), body);
      const withInput = issuesOf(sampleBodySchema(), body, {
        reportInput: true
      });

      expect(withInput.some((issue) => issue.input !== undefined)).toBe(true);

      expect(zodIssuesToErrors([{ part: 'body', issues: withInput }])).toEqual(
        zodIssuesToErrors([{ part: 'body', issues }])
      );
    });

    it('should be deterministic for the same input', () => {
      const parts = [
        { part: 'params' as const, issues: issuesOf(sampleParamsSchema(), {}) },
        {
          part: 'body' as const,
          issues: unknownKeysIssues(fieldNames(MAX_FIELD_ERRORS + 3))
        }
      ];

      expect(zodIssuesToErrors(parts)).toEqual(zodIssuesToErrors(parts));
    });
  });
});
