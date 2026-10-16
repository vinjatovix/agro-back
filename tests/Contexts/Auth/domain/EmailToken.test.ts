import {
  ACTIVATION_TOKEN_TTL_MS,
  EmailToken,
  PASSWORD_RESET_TOKEN_TTL_MS
} from '../../../../src/Contexts/Auth/domain/value-objects/EmailToken.js';
import { InvalidArgumentException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { EmailTokenMother } from './mothers/EmailTokenMother.js';

describe('EmailToken', () => {
  it('should round-trip a valid token through its primitives', () => {
    const primitives = EmailTokenMother.validPrimitives();

    const token = EmailToken.fromPrimitives(primitives);

    expect(token.toPrimitives()).toEqual(primitives);
  });

  it.each(EmailTokenMother.invalidPrimitives())(
    'should reject %s',
    (_case, primitives) => {
      expect(() => EmailToken.create(primitives)).toThrow(
        InvalidArgumentException
      );
    }
  );

  describe('isExpiredAt', () => {
    const expiresAt = new Date('2026-10-16T12:00:00.000Z');
    const token = EmailTokenMother.activation({ expiresAt });

    it('should not be expired before its expiry', () => {
      expect(token.isExpiredAt(new Date(expiresAt.getTime() - 1))).toBe(false);
    });

    it('should be expired exactly at its expiry', () => {
      expect(token.isExpiredAt(expiresAt)).toBe(true);
    });

    it('should be expired after its expiry', () => {
      expect(token.isExpiredAt(new Date(expiresAt.getTime() + 1))).toBe(true);
    });
  });

  describe('matches', () => {
    const token = EmailTokenMother.activation();

    it('should match its own purpose and hash', () => {
      expect(token.matches('activation', token.tokenHash)).toBe(true);
    });

    it('should not match another purpose', () => {
      expect(token.matches('passwordReset', token.tokenHash)).toBe(false);
    });

    it('should not match another hash', () => {
      expect(token.matches('activation', EmailTokenMother.randomHash())).toBe(
        false
      );
    });
  });

  it('should build an activation token that expires 24 hours after issue', () => {
    const issuedAt = new Date('2026-10-16T08:00:00.000Z');

    const token = EmailToken.activation(
      EmailTokenMother.randomHash(),
      issuedAt
    );

    expect(token.purpose).toBe('activation');
    expect(token.expiresAt.getTime() - issuedAt.getTime()).toBe(
      ACTIVATION_TOKEN_TTL_MS
    );
    expect(ACTIVATION_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('should build a password reset token that expires 30 minutes after issue', () => {
    const issuedAt = new Date('2026-10-16T08:00:00.000Z');

    const token = EmailToken.passwordReset(
      EmailTokenMother.randomHash(),
      issuedAt
    );

    expect(token.purpose).toBe('passwordReset');
    expect(token.expiresAt.getTime() - issuedAt.getTime()).toBe(
      PASSWORD_RESET_TOKEN_TTL_MS
    );
    expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('should not share its expiry date with the caller', () => {
    const expiresAt = new Date('2026-10-16T12:00:00.000Z');
    const token = EmailTokenMother.activation({ expiresAt });

    expiresAt.setFullYear(2030);

    expect(token.expiresAt.getFullYear()).toBe(2026);
  });
});
