import { createError } from '../../../../shared/errors/index.js';
import { DISPOSABLE_EMAIL_DOMAINS } from './disposableEmailDomains.js';

export class Email {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
  private static readonly MIN_LENGTH = 6;
  private static readonly MAX_LENGTH = 255;
  private static readonly DOMAINS_BLACKLIST = new Set<string>(
    DISPOSABLE_EMAIL_DOMAINS
  );
  readonly value: string;

  constructor(value: string) {
    const normalizedValue = Email.normalize(value);
    Email.ensureIsEmailAddress(normalizedValue);
    Email.ensureLength(normalizedValue);
    Email.ensureDomainsBlacklist(normalizedValue);
    this.value = normalizedValue;
  }

  private static normalize(value: string): string {
    const trimmedValue = value.trim();
    const [localPart, domain, ...rest] = trimmedValue.split('@');

    if (!localPart || !domain || rest.length > 0) {
      return trimmedValue;
    }

    return `${localPart.toLowerCase()}@${domain.toLowerCase()}`;
  }

  private static ensureLength(value: string): void {
    if (value.length < Email.MIN_LENGTH) {
      throw createError.badRequest(
        `<Email> must be at least ${Email.MIN_LENGTH} characters long`
      );
    }

    if (value.length > Email.MAX_LENGTH) {
      throw createError.badRequest(
        `<Email> must be at most ${Email.MAX_LENGTH} characters long`
      );
    }
  }

  private static ensureDomainsBlacklist(value: string): void {
    const domain = value.slice(value.lastIndexOf('@') + 1);

    const isBlockedDomain = Array.from(Email.DOMAINS_BLACKLIST).some(
      (blockedDomain) =>
        domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
    );

    if (isBlockedDomain) {
      throw createError.badRequest(
        `<Email> does not allow the domain <${value}>`
      );
    }
  }

  private static ensureIsEmailAddress(value: string): void {
    if (!Email.EMAIL_REGEX.test(value)) {
      throw createError.badRequest(
        `<Email> does not allow the value <${value}>`
      );
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
