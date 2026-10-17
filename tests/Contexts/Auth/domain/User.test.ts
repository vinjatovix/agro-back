import { User } from '../../../../src/Contexts/Auth/domain/entities/User.js';
import { InvalidEmailTokenException } from '../../../../src/Contexts/Auth/domain/errors/index.js';
import { randomUserId } from '../../../../src/Contexts/Auth/domain/UserId.js';
import {
  EmailToken,
  UserAuthMethod
} from '../../../../src/Contexts/Auth/domain/value-objects/index.js';
import {
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../../src/Contexts/shared/domain/errors/index.js';
import { EmailMother } from '../../shared/domain/mothers/EmailMother.js';
import { EmailTokenMother } from './mothers/EmailTokenMother.js';
import { UserMother } from './mothers/UserMother.js';

const REGISTERED_AT = new Date('2026-10-16T08:00:00.000Z');
const LATER = new Date('2026-10-16T09:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const containsNull = (value: unknown): boolean => {
  if (value === null) return true;
  if (Array.isArray(value)) return value.some(containsNull);
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Object.values(value as Record<string, unknown>).some(containsNull);
  }
  return false;
};

describe('User', () => {
  it('should expose all fields with their values', () => {
    const user = UserMother.random();

    expect(typeof user.id).toBe('string');
    expect(typeof user.email.value).toBe('string');
    expect(typeof user.username.value).toBe('string');
    expect(typeof user.password?.value).toBe('string');
    expect(typeof user.emailValidated).toBe('boolean');
    expect(Array.isArray(user.roles.value)).toBe(true);
  });

  it('should reconstruct a user equal to the original from its primitives', () => {
    const user = UserMother.pending();

    const restored = User.fromPrimitives(user.toPrimitives());

    expect(restored).toBeInstanceOf(User);
    expect(restored).toEqual(user);
  });

  it('should refuse two email tokens of the same purpose', () => {
    expect(() =>
      UserMother.create({
        emailTokens: [
          EmailTokenMother.activation(),
          EmailTokenMother.activation()
        ]
      })
    ).toThrow(InvalidArgumentException);
  });

  describe('registerWithProvider', () => {
    const method = UserMother.randomGoogleAuthMethod();
    const username = UserMother.randomUsername();
    const user = User.registerWithProvider({
      id: randomUserId(),
      email: EmailMother.random(),
      username,
      method,
      at: REGISTERED_AT
    });

    it('should create a validated account with the user role', () => {
      expect(user.emailValidated).toBe(true);
      expect(user.roles.toPrimitives()).toEqual(['user']);
    });

    it('should hold only the provider method, no password and no email tokens', () => {
      expect(user.authMethods).toEqual([method]);
      expect(user.password).toBeUndefined();
      expect(user.toPrimitives()).not.toHaveProperty('password');
      expect(user.toPrimitives()).not.toHaveProperty('emailTokens');
    });

    it('should be created and updated by its own username at registration', () => {
      expect(user.metadata.toPrimitives()).toEqual({
        createdAt: REGISTERED_AT,
        createdBy: username.value,
        updatedAt: REGISTERED_AT,
        updatedBy: username.value
      });
    });

    it('should refuse a local method', () => {
      const password = UserMother.randomPasswordHash();

      expect(() =>
        User.registerWithProvider({
          id: randomUserId(),
          email: EmailMother.random(),
          username,
          method: UserAuthMethod.local(password, REGISTERED_AT),
          at: REGISTERED_AT
        })
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('register', () => {
    const token = EmailTokenMother.activation({
      expiresAt: new Date(REGISTERED_AT.getTime() + 24 * HOUR_MS)
    });
    const password = UserMother.randomPasswordHash();
    const username = UserMother.randomUsername();
    const user = User.register({
      id: randomUserId(),
      email: EmailMother.random(),
      username,
      password,
      activationToken: token,
      at: REGISTERED_AT
    });

    it('should create a pending account with the user role', () => {
      expect(user.emailValidated).toBe(false);
      expect(user.roles.toPrimitives()).toEqual(['user']);
    });

    it('should hold one local method with the password, linked at registration', () => {
      expect(user.password).toEqual(password);
      expect(user.authMethods).toHaveLength(1);
      expect(user.authMethods[0]?.toPrimitives()).toEqual({
        provider: 'local',
        password: password.value,
        linkedAt: REGISTERED_AT
      });
    });

    it('should hold only the activation token', () => {
      expect(user.toPrimitives().emailTokens).toEqual([token.toPrimitives()]);
    });

    it('should be created and updated by its own username at registration', () => {
      expect(user.metadata.toPrimitives()).toEqual({
        createdAt: REGISTERED_AT,
        createdBy: username.value,
        updatedAt: REGISTERED_AT,
        updatedBy: username.value
      });
    });

    it('should refuse a token of another purpose', () => {
      expect(() =>
        User.register({
          id: randomUserId(),
          email: EmailMother.random(),
          username,
          password,
          activationToken: EmailTokenMother.passwordReset(),
          at: REGISTERED_AT
        })
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('issueEmailToken', () => {
    it('should replace a token of the same purpose', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });
      const replacement = EmailTokenMother.activation();

      user.issueEmailToken(replacement, LATER);

      expect(user.toPrimitives().emailTokens).toEqual([
        replacement.toPrimitives()
      ]);
    });

    it('should keep tokens of other purposes', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });
      const [activation] = user.toPrimitives().emailTokens ?? [];
      const reset = EmailTokenMother.passwordReset();

      user.issueEmailToken(reset, LATER);

      expect(user.toPrimitives().emailTokens).toEqual([
        activation,
        reset.toPrimitives()
      ]);
    });

    it('should audit the change by the account at the given time', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });

      user.issueEmailToken(EmailTokenMother.passwordReset(), LATER);

      expect(user.metadata.updatedAt).toEqual(LATER);
      expect(user.metadata.updatedBy).toBe(user.username.value);
      expect(user.metadata.createdAt).toEqual(REGISTERED_AT);
    });
  });

  describe('activate', () => {
    const tokenAt = (expiresAt: Date) =>
      EmailTokenMother.activation({ expiresAt });

    it('should validate the email and use up the token', () => {
      const token = tokenAt(new Date(LATER.getTime() + HOUR_MS));
      const user = UserMother.pending({ token, at: REGISTERED_AT });

      user.activate(token.tokenHash, LATER);

      expect(user.emailValidated).toBe(true);
      expect(user.toPrimitives()).not.toHaveProperty('emailTokens');
      expect(user.metadata.updatedAt).toEqual(LATER);
      expect(user.metadata.updatedBy).toBe(user.username.value);
    });

    it('should refuse the same token a second time', () => {
      const token = tokenAt(new Date(LATER.getTime() + HOUR_MS));
      const user = UserMother.pending({ token, at: REGISTERED_AT });
      user.activate(token.tokenHash, LATER);

      expect(() => user.activate(token.tokenHash, LATER)).toThrow(
        InvalidEmailTokenException
      );
    });

    it('should refuse an unknown hash', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });

      expect(() =>
        user.activate(EmailTokenMother.randomHash(), REGISTERED_AT)
      ).toThrow(InvalidEmailTokenException);
    });

    it('should refuse an expired token', () => {
      const token = tokenAt(LATER);
      const user = UserMother.pending({ token, at: REGISTERED_AT });

      expect(() => user.activate(token.tokenHash, LATER)).toThrow(
        InvalidEmailTokenException
      );
      expect(user.emailValidated).toBe(false);
    });

    it('should refuse a password reset token', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });
      const reset = EmailTokenMother.passwordReset();
      user.issueEmailToken(reset, REGISTERED_AT);

      expect(() => user.activate(reset.tokenHash, REGISTERED_AT)).toThrow(
        InvalidEmailTokenException
      );
    });

    it('should refuse an account that is already active', () => {
      const token = EmailTokenMother.activation();
      const user = UserMother.create({
        emailValidated: true,
        emailTokens: [token]
      });

      expect(() => user.activate(token.tokenHash, new Date())).toThrow(
        InvalidEmailTokenException
      );
    });
  });

  describe('changePassword', () => {
    it('should replace the password and keep when the local method was linked', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });
      const hash = UserMother.otherPasswordHash();

      user.changePassword(hash, LATER);

      expect(user.password).toEqual(hash);
      expect(user.findAuthMethod('local')?.toPrimitives()).toEqual({
        provider: 'local',
        password: hash.value,
        linkedAt: REGISTERED_AT
      });
      expect(user.metadata.updatedAt).toEqual(LATER);
      expect(user.metadata.updatedBy).toBe(user.username.value);
    });

    it('should refuse an account without a local password', () => {
      const user = UserMother.googleOnly();

      expect(() =>
        user.changePassword(UserMother.otherPasswordHash(), LATER)
      ).toThrow(DomainUnauthorizedException);
    });
  });

  describe('linkProvider', () => {
    const google = (): UserAuthMethod =>
      UserMother.randomProviderMethod('google', undefined, LATER);

    it('should change nothing when the provider is already linked', () => {
      const user = UserMother.activeLinkedTo('google');
      const before = user.toPrimitives();

      const outcome = user.linkProvider(google(), LATER);

      expect(outcome).toBe('alreadyLinked');
      expect(user.toPrimitives()).toEqual(before);
    });

    it('should secure a pending account: provider in, password, local method and tokens out', () => {
      const user = UserMother.pending({ at: REGISTERED_AT });
      const method = google();

      const outcome = user.linkProvider(method, LATER);

      expect(outcome).toBe('securedPendingAccount');
      const primitives = user.toPrimitives();
      expect(primitives.emailValidated).toBe(true);
      expect(primitives).not.toHaveProperty('password');
      expect(primitives).not.toHaveProperty('emailTokens');
      expect(primitives.authMethods).toEqual([method.toPrimitives()]);
      expect(user.metadata.updatedAt).toEqual(LATER);
      expect(user.metadata.updatedBy).toBe(user.username.value);
    });

    it('should add the provider to an active account and keep its password', () => {
      const user = UserMother.active();
      const password = user.password;
      const method = google();

      const outcome = user.linkProvider(method, LATER);

      expect(outcome).toBe('linkedToActiveAccount');
      expect(user.password).toEqual(password);
      expect(user.findAuthMethod('local')).toBeDefined();
      expect(user.findAuthMethod('google')?.toPrimitives()).toEqual(
        method.toPrimitives()
      );
      expect(user.metadata.updatedAt).toEqual(LATER);
    });

    it('should refuse to link the local provider', () => {
      const user = UserMother.active();

      expect(() =>
        user.linkProvider(
          UserAuthMethod.local(UserMother.randomPasswordHash(), LATER),
          LATER
        )
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('hasRecentResetToken', () => {
    it('should return false when user has no reset token', () => {
      const user = UserMother.active();

      const result = user.hasRecentResetToken(new Date());

      expect(result).toBe(false);
    });

    it('should return true when a reset token was issued less than 2 minutes ago', () => {
      const issuedAt = new Date('2026-10-16T10:00:00.000Z');
      const token = EmailTokenMother.passwordReset({
        expiresAt: new Date(issuedAt.getTime() + 30 * 60 * 1000)
      });
      const user = UserMother.activeWithResetToken(token);
      const checkAt = new Date('2026-10-16T10:01:00.000Z');

      const result = user.hasRecentResetToken(checkAt);

      expect(result).toBe(true);
    });

    it.each([
      ['exactly 2 minutes ago', '2026-10-16T10:02:00.000Z'],
      ['more than 2 minutes ago', '2026-10-16T10:02:01.000Z']
    ])(
      'should return false when the reset token was issued %s',
      (_case, checkAt) => {
        const issuedAt = new Date('2026-10-16T10:00:00.000Z');
        const token = EmailToken.passwordReset(
          EmailTokenMother.randomHash(),
          issuedAt
        );
        const user = UserMother.activeWithResetToken(token);

        expect(user.hasRecentResetToken(new Date(checkAt))).toBe(false);
      }
    );

    it('should return false when the reset token is expired', () => {
      const checkAt = new Date('2026-10-16T11:00:00.000Z');
      const token = EmailTokenMother.expiredPasswordReset(checkAt);
      const user = UserMother.activeWithResetToken(token);

      const result = user.hasRecentResetToken(checkAt);

      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should reset password on an active account and remove the reset token', () => {
      const token = EmailTokenMother.passwordReset();
      const user = UserMother.activeWithResetToken(token);
      const newPassword = UserMother.randomPasswordHash();
      const at = new Date();

      user.resetPassword(token.tokenHash, newPassword, at);

      expect(user.password).toEqual(newPassword);
      expect(user.emailValidated).toBe(true);
      expect(user.emailTokens).toEqual([]);
      expect(user.findAuthMethod('local')?.password).toEqual(newPassword);
      expect(user.metadata.updatedAt).toEqual(at);
      expect(user.metadata.updatedBy).toBe(user.username.value);
    });

    it('should validate a pending account, replace password, and purge activation token', () => {
      const token = EmailTokenMother.passwordReset();
      const user = UserMother.pendingWithResetToken(token);
      const newPassword = UserMother.randomPasswordHash();
      const at = new Date();

      user.resetPassword(token.tokenHash, newPassword, at);

      expect(user.password).toEqual(newPassword);
      expect(user.emailValidated).toBe(true);
      expect(user.emailTokens).toEqual([]);
      expect(user.findAuthMethod('local')?.password).toEqual(newPassword);
      expect(user.metadata.updatedAt).toEqual(at);
    });

    it('should add local password to a google-only account and preserve google provider', () => {
      const token = EmailTokenMother.passwordReset();
      const user = UserMother.googleOnlyWithResetToken(token);
      const newPassword = UserMother.randomPasswordHash();
      const at = new Date();

      user.resetPassword(token.tokenHash, newPassword, at);

      expect(user.password).toEqual(newPassword);
      expect(user.emailValidated).toBe(true);
      expect(user.emailTokens).toEqual([]);
      expect(user.findAuthMethod('local')?.password).toEqual(newPassword);
      expect(user.findAuthMethod('google')).toBeDefined();
      expect(user.metadata.updatedAt).toEqual(at);
    });

    it.each([
      [
        'an unknown token hash',
        (_at: Date): EmailToken => EmailTokenMother.passwordReset(),
        (_token: EmailToken): string => '0'.repeat(64)
      ],
      [
        'an expired token',
        (at: Date): EmailToken => EmailTokenMother.expiredPasswordReset(at),
        (token: EmailToken): string => token.tokenHash
      ]
    ])(
      'should throw InvalidEmailTokenException when given %s',
      (_case, makeToken, hashToSubmit) => {
        const at = new Date('2026-10-16T10:00:00.000Z');
        const token = makeToken(at);
        const user = UserMother.activeWithResetToken(token);

        expect(() =>
          user.resetPassword(
            hashToSubmit(token),
            UserMother.randomPasswordHash(),
            at
          )
        ).toThrow(InvalidEmailTokenException);
      }
    );

    it('should refuse an activation token passed to resetPassword', () => {
      const activationToken = EmailTokenMother.activation();
      const user = UserMother.pending({ token: activationToken });
      const newPassword = UserMother.randomPasswordHash();
      const at = new Date();

      expect(() =>
        user.resetPassword(activationToken.tokenHash, newPassword, at)
      ).toThrow(InvalidEmailTokenException);
    });
  });

  describe('isReplaceableAt', () => {
    it.each([
      ['a pending account with a valid token', UserMother.pending(), false],
      [
        'a pending account with an expired token',
        UserMother.pendingExpired(),
        true
      ],
      [
        'a pending account without token',
        UserMother.pendingWithoutToken(),
        true
      ],
      ['an active account', UserMother.active(), false]
    ])('%s: replaceable is %s', (_case, user, replaceable) => {
      const now = new Date();

      expect(user.isReplaceableAt(now)).toBe(replaceable);
    });
  });

  describe('canStartSession', () => {
    it.each([
      ['pending', UserMother.pending(), false],
      ['active', UserMother.active(), true]
    ])('%s account: %s', (_state, user, expected) => {
      expect(user.canStartSession()).toBe(expected);
    });
  });

  describe('toPrimitives', () => {
    it.each([
      ['pending', UserMother.pending()],
      ['active', UserMother.active()],
      ['google only', UserMother.googleOnly()],
      ['pending without token', UserMother.pendingWithoutToken()]
    ])('should never contain null for a %s account', (_case, user) => {
      expect(containsNull(user.toPrimitives())).toBe(false);
    });

    it('should omit the token list when it is empty', () => {
      expect(UserMother.active().toPrimitives()).not.toHaveProperty(
        'emailTokens'
      );
    });

    it('should omit the password when there is none', () => {
      expect(UserMother.googleOnly().toPrimitives()).not.toHaveProperty(
        'password'
      );
    });
  });
});
