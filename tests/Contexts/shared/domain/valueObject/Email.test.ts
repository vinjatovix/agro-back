import { z } from 'zod';

import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { DISPOSABLE_EMAIL_DOMAINS } from '../../../../../src/Contexts/shared/domain/valueObject/disposableEmailDomains.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';

describe('Email', () => {
  it('should create a valid email', () => {
    const email = new Email('user@example.com');

    expect(email.value).toBe('user@example.com');
  });

  it('should trim value and normalize whole email to lowercase', () => {
    const email = new Email('  User@EXAMPLE.COM  ');

    expect(email.value).toBe('user@example.com');
  });

  it('should throw when value is too short', () => {
    expect(() => new Email('a@b.c')).toThrow(InvalidArgumentException);
  });

  it('should throw when value is too long', () => {
    const tooLong = `a@${'b'.repeat(253)}.com`;

    expect(() => new Email(tooLong)).toThrow(InvalidArgumentException);
  });

  it('should throw for invalid format', () => {
    expect(() => new Email('invalid-email')).toThrow(InvalidArgumentException);
  });

  it.each([
    'a!b@example.com',
    'a#b@example.com',
    'a/b@example.com',
    '.user@example.com',
    'user.@example.com',
    'us..er@example.com',
    'user@-example.com',
    'user@example.c0m'
  ])('should throw for %s, which Zod also rejects', (value) => {
    expect(z.email().safeParse(value).success).toBe(false);
    expect(() => new Email(value)).toThrow(InvalidArgumentException);
  });

  it.each([
    'user@example.com',
    'first.last@example.com',
    "o'neil@example.com",
    'user+tag@sub.example.co',
    'user_name-1@example-mail.com'
  ])('should accept %s, which Zod also accepts', (value) => {
    expect(z.email().safeParse(value).success).toBe(true);
    expect(new Email(value).value).toBe(value);
  });

  it('should throw for disposable blocked domain', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0];

    expect(() => new Email(`user@${blockedDomain}`)).toThrow(
      InvalidArgumentException
    );
  });

  it('should throw for blocked domain even when input domain is uppercase', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0].toUpperCase();

    expect(() => new Email(`user@${blockedDomain}`)).toThrow(
      InvalidArgumentException
    );
  });

  it('should throw for disposable blocked subdomain', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0];

    expect(() => new Email(`user@sub.${blockedDomain}`)).toThrow(
      InvalidArgumentException
    );
  });

  it('should return value in toString()', () => {
    const email = new Email('user@example.com');

    expect(email.toString()).toBe('user@example.com');
  });

  it('should compare equal for uppercase vs lowercase email', () => {
    const a = new Email('USER@EXAMPLE.COM');
    const b = new Email('user@example.com');

    expect(a.equals(b)).toBe(true);
  });

  it('should compare different for different values', () => {
    const a = new Email('user1@example.com');
    const b = new Email('user2@example.com');

    expect(a.equals(b)).toBe(false);
  });
});
