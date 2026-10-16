import { z } from 'zod';

import { PASSWORDS_DO_NOT_MATCH_MESSAGE } from '../../../../Contexts/Auth/application/index.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { emptyQuery } from '../../shared/requestSchemas.js';

type PasswordPair = { password: string; repeatPassword: string };

const passwordPair = z.object({
  password: z.string(),
  repeatPassword: z.string()
});

/**
 * Reports a mismatch under `repeatPassword` even when other fields fail, so
 * one response lists every error. Skipped while either password is not a
 * string: that field already has its own message.
 */
export const withMatchingPasswords = <T extends z.ZodType<PasswordPair>>(
  schema: T
): T =>
  schema.refine((data: PasswordPair) => data.password === data.repeatPassword, {
    path: ['repeatPassword'],
    message: PASSWORDS_DO_NOT_MATCH_MESSAGE,
    when: (payload) => passwordPair.safeParse(payload.value).success
  });

// Password strength is a domain rule (`PlainPassword`): only the shape is
// checked here.
const registerBody = withMatchingPasswords(
  z.object({
    id: z.uuid(),
    email: z.email(),
    username: z.string(),
    password: z.string(),
    repeatPassword: z.string()
  })
);

const loginBody = z.object({
  email: z.email(),
  password: z.string()
});

const googleAuthBody = z.object({ idToken: z.string() });

const activateBody = z.object({ token: z.string().min(1).max(512) });

const updatePasswordBody = withMatchingPasswords(
  z.object({
    password: z.string(),
    repeatPassword: z.string(),
    oldPassword: z.string()
  })
);

const forgotPasswordBody = z.object({ email: z.email() });

const resetPasswordBody = withMatchingPasswords(
  z.object({
    token: z.string().min(1).max(512),
    password: z.string(),
    repeatPassword: z.string()
  })
);

export const registerRequest = {
  query: emptyQuery,
  body: registerBody
} satisfies RequestSchemas;

export const loginRequest = {
  query: emptyQuery,
  body: loginBody
} satisfies RequestSchemas;

export const googleAuthRequest = {
  query: emptyQuery,
  body: googleAuthBody
} satisfies RequestSchemas;

export const activateRequest = {
  query: emptyQuery,
  body: activateBody
} satisfies RequestSchemas;

export const updatePasswordRequest = {
  query: emptyQuery,
  body: updatePasswordBody
} satisfies RequestSchemas;

export const forgotPasswordRequest = {
  query: emptyQuery,
  body: forgotPasswordBody
} satisfies RequestSchemas;

export const resetPasswordRequest = {
  query: emptyQuery,
  body: resetPasswordBody
} satisfies RequestSchemas;
