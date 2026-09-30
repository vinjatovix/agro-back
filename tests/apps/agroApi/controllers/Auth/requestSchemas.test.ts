import httpStatus from 'http-status';
import { z } from 'zod';

import {
  googleAuthRequest,
  loginRequest,
  registerRequest,
  updatePasswordRequest,
  validateMailRequest,
  withMatchingPasswords
} from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { PASSWORDS_DO_NOT_MATCH_MESSAGE } from '../../../../../src/Contexts/Auth/application/index.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import { UNKNOWN_FIELD_MESSAGE } from '../../middlewares/fixtures/validationErrorContract.js';

import {
  buildGoogleAuthBody,
  buildLoginBody,
  buildRegisterBody,
  buildUpdatePasswordBody,
  STRONG_PASSWORD as STRONG
} from './fixtures/authBodies.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from './fixtures/httpFakes.js';

type RequestParts = Parameters<typeof buildRequest>[0];

const validate = (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<unknown> =>
  runWithValidation(schemas, buildRequest(parts), buildResponse().res);

const errorsOf = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<Record<string, string>> => {
  const error = await validate(schemas, parts);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);

  return (error as HttpError).errors ?? {};
};

const issuesOf = (result: z.ZodSafeParseResult<unknown>): z.core.$ZodIssue[] =>
  result.success ? [] : result.error.issues;

const messagesAt = (
  result: z.ZodSafeParseResult<unknown>,
  key: string
): string[] =>
  issuesOf(result)
    .filter((issue) => issue.path.join('.') === key)
    .map((issue) => issue.message);

describe('password rules', () => {
  describe('withMatchingPasswords', () => {
    const schema = withMatchingPasswords(
      z.object({
        username: z.string(),
        password: z.string(),
        repeatPassword: z.string()
      })
    );

    it('reports the mismatch under repeatPassword with other failing fields', () => {
      const result = schema.safeParse({
        password: STRONG,
        repeatPassword: `${STRONG}x`
      });

      expect(messagesAt(result, 'repeatPassword')).toEqual([
        PASSWORDS_DO_NOT_MATCH_MESSAGE
      ]);
      expect(messagesAt(result, 'username')).toHaveLength(1);
    });

    it('does not run when a password is not a string', () => {
      const result = schema.safeParse({
        username: 'user',
        password: STRONG,
        repeatPassword: 1
      });

      expect(messagesAt(result, 'repeatPassword')).not.toContain(
        PASSWORDS_DO_NOT_MATCH_MESSAGE
      );
    });

    it('accepts matching passwords', () => {
      const result = schema.safeParse({
        username: 'user',
        password: STRONG,
        repeatPassword: STRONG
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Auth request schemas', () => {
  describe('registerRequest', () => {
    it('accepts a valid body', async () => {
      await expect(
        validate(registerRequest, { body: buildRegisterBody() })
      ).resolves.toBeUndefined();
    });

    it('reports every invalid field without echoing values', async () => {
      const errors = await errorsOf(registerRequest, {
        body: { email: 'aaJaa', password: 1234, repeatPassword: 1234 }
      });

      expect(Object.keys(errors)).toEqual([
        'id',
        'email',
        'username',
        'password',
        'repeatPassword'
      ]);
      Object.values(errors).forEach((message) => {
        expect(message).not.toContain('aaJaa');
        expect(message).not.toContain('1234');
      });
    });

    it('rejects an email outside the strict format', async () => {
      const errors = await errorsOf(registerRequest, {
        body: buildRegisterBody({ email: 'a!b@example.com' })
      });

      expect(Object.keys(errors)).toEqual(['email']);
    });

    it('rejects an id that is not an RFC UUID', async () => {
      const errors = await errorsOf(registerRequest, {
        body: buildRegisterBody({ id: '12345678-1234-1234-1234-123456789012' })
      });

      expect(Object.keys(errors)).toEqual(['id']);
    });

    it('leaves password strength to the domain', async () => {
      await expect(
        validate(registerRequest, {
          body: buildRegisterBody({ password: 'weak', repeatPassword: 'weak' })
        })
      ).resolves.toBeUndefined();
    });

    it('reports a mismatch under repeatPassword', async () => {
      const errors = await errorsOf(registerRequest, {
        body: buildRegisterBody({ repeatPassword: `${STRONG}x` })
      });

      expect(errors).toEqual({
        repeatPassword: PASSWORDS_DO_NOT_MATCH_MESSAGE
      });
    });
  });

  describe('loginRequest', () => {
    it('accepts a valid body', async () => {
      await expect(
        validate(loginRequest, { body: buildLoginBody() })
      ).resolves.toBeUndefined();
    });

    it('rejects an email outside the strict format', async () => {
      const errors = await errorsOf(loginRequest, {
        body: buildLoginBody({ email: 'a!b@example.com' })
      });

      expect(Object.keys(errors)).toEqual(['email']);
    });

    it('reports unknown body and query fields under their own key', async () => {
      const errors = await errorsOf(loginRequest, {
        query: { foo: '1' },
        body: buildLoginBody({ bar: 1 })
      });

      expect(errors).toEqual({
        foo: UNKNOWN_FIELD_MESSAGE,
        bar: UNKNOWN_FIELD_MESSAGE
      });
    });
  });

  describe('googleAuthRequest', () => {
    it('accepts a valid body', async () => {
      await expect(
        validate(googleAuthRequest, { body: buildGoogleAuthBody() })
      ).resolves.toBeUndefined();
    });

    it('rejects a missing idToken', async () => {
      const errors = await errorsOf(googleAuthRequest, { body: {} });

      expect(Object.keys(errors)).toEqual(['idToken']);
    });
  });

  describe('validateMailRequest', () => {
    it('accepts a token without body', async () => {
      await expect(
        validate(validateMailRequest, {
          params: { token: 'token' },
          body: undefined
        })
      ).resolves.toBeUndefined();
    });

    it('rejects an empty token', async () => {
      const errors = await errorsOf(validateMailRequest, {
        params: { token: '' }
      });

      expect(Object.keys(errors)).toEqual(['token']);
    });

    it('rejects any body field', async () => {
      const errors = await errorsOf(validateMailRequest, {
        params: { token: 'token' },
        body: { a: 1 }
      });

      expect(errors).toEqual({ a: UNKNOWN_FIELD_MESSAGE });
    });
  });

  describe('updatePasswordRequest', () => {
    it('accepts a valid body', async () => {
      await expect(
        validate(updatePasswordRequest, { body: buildUpdatePasswordBody() })
      ).resolves.toBeUndefined();
    });

    it('reports a mismatch together with an unknown field', async () => {
      const errors = await errorsOf(updatePasswordRequest, {
        body: buildUpdatePasswordBody({
          repeatPassword: `${STRONG}x`,
          extra: true
        })
      });

      expect(errors).toEqual({
        repeatPassword: PASSWORDS_DO_NOT_MATCH_MESSAGE,
        extra: UNKNOWN_FIELD_MESSAGE
      });
    });
  });
});
