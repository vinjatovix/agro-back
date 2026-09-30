import { RegisterUserRequestMother } from '../../../../../Contexts/Auth/application/mothers/index.js';

// Meets the strength rule: 8+ characters with all four classes.
export const STRONG_PASSWORD = 'Abcdef1!';

type Body = Record<string, unknown>;

export const buildRegisterBody = (overrides: Body = {}): Body => {
  const request = RegisterUserRequestMother.random();

  return { ...request, repeatPassword: request.password, ...overrides };
};

export const buildLoginBody = (overrides: Body = {}): Body => {
  const { email, password } = RegisterUserRequestMother.random();

  return { email, password, ...overrides };
};

export const buildGoogleAuthBody = (overrides: Body = {}): Body => ({
  idToken: 'google-id-token',
  ...overrides
});

export const buildUpdatePasswordBody = (overrides: Body = {}): Body => ({
  password: STRONG_PASSWORD,
  repeatPassword: STRONG_PASSWORD,
  oldPassword: 'old-password',
  ...overrides
});
