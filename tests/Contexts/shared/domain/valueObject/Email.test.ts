import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { DISPOSABLE_EMAIL_DOMAINS } from '../../../../../src/Contexts/shared/domain/valueObject/disposableEmailDomains.js';

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
    expect(() => new Email('a@b.c')).toThrow(
      '<Email> must be at least 6 characters long'
    );
  });

  it('should throw when value is too long', () => {
    const tooLong = `a@${'b'.repeat(253)}.com`;

    expect(() => new Email(tooLong)).toThrow(
      '<Email> must be at most 255 characters long'
    );
  });

  it('should throw for invalid format', () => {
    expect(() => new Email('invalid-email')).toThrow(
      '<Email> does not allow the value <invalid-email>'
    );
  });

  it('should throw for disposable blocked domain', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0];

    expect(() => new Email(`user@${blockedDomain}`)).toThrow(
      `<Email> does not allow the domain <user@${blockedDomain}>`
    );
  });

  it('should throw for blocked domain even when input domain is uppercase', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0].toUpperCase();

    expect(() => new Email(`user@${blockedDomain}`)).toThrow(
      `<Email> does not allow the domain <user@${blockedDomain.toLowerCase()}>`
    );
  });

  it('should throw for disposable blocked subdomain', () => {
    const blockedDomain = DISPOSABLE_EMAIL_DOMAINS[0];

    expect(() => new Email(`user@sub.${blockedDomain}`)).toThrow(
      `<Email> does not allow the domain <user@sub.${blockedDomain}>`
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
