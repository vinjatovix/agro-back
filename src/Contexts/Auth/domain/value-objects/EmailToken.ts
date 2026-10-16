import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../shared/domain/interfaces/Serializable.js';
import {
  EMAIL_TOKEN_PURPOSES,
  type EmailTokenPrimitives,
  type EmailTokenPurpose
} from './types/EmailTokenPrimitives.js';

export const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_THROTTLE_WINDOW_MS = 2 * 60 * 1000;

// SHA-256 in lowercase hex.
const TOKEN_HASH_REGEX = /^[0-9a-f]{64}$/;

/**
 * A one-time token sent by email, stored only as its hash. The plain token
 * never enters the domain.
 */
export class EmailToken implements Serializable<EmailTokenPrimitives> {
  private constructor(
    readonly purpose: EmailTokenPurpose,
    readonly tokenHash: string,
    readonly expiresAt: Date
  ) {}

  static create({
    purpose,
    tokenHash,
    expiresAt
  }: EmailTokenPrimitives): EmailToken {
    EmailToken.ensurePurpose(purpose);
    EmailToken.ensureTokenHash(tokenHash);
    EmailToken.ensureExpiresAt(expiresAt);

    return new EmailToken(purpose, tokenHash, new Date(expiresAt.getTime()));
  }

  static fromPrimitives(primitives: EmailTokenPrimitives): EmailToken {
    return EmailToken.create({
      ...primitives,
      expiresAt: new Date(primitives.expiresAt)
    });
  }

  /** An activation token that expires `ACTIVATION_TOKEN_TTL_MS` after `issuedAt`. */
  static activation(tokenHash: string, issuedAt: Date): EmailToken {
    return EmailToken.create({
      purpose: 'activation',
      tokenHash,
      expiresAt: new Date(issuedAt.getTime() + ACTIVATION_TOKEN_TTL_MS)
    });
  }

  /** A password reset token that expires `PASSWORD_RESET_TOKEN_TTL_MS` after `issuedAt`. */
  static passwordReset(tokenHash: string, issuedAt: Date): EmailToken {
    return EmailToken.create({
      purpose: 'passwordReset',
      tokenHash,
      expiresAt: new Date(issuedAt.getTime() + PASSWORD_RESET_TOKEN_TTL_MS)
    });
  }

  isExpiredAt(at: Date): boolean {
    return this.expiresAt.getTime() <= at.getTime();
  }

  matches(purpose: EmailTokenPurpose, tokenHash: string): boolean {
    return this.purpose === purpose && this.tokenHash === tokenHash;
  }

  toPrimitives(): EmailTokenPrimitives {
    return {
      purpose: this.purpose,
      tokenHash: this.tokenHash,
      expiresAt: new Date(this.expiresAt.getTime())
    };
  }

  private static ensurePurpose(purpose: unknown): void {
    if (!EMAIL_TOKEN_PURPOSES.includes(purpose as EmailTokenPurpose)) {
      throw new InvalidArgumentException(
        `<EmailToken> does not allow the purpose <${String(purpose)}>`
      );
    }
  }

  private static ensureTokenHash(tokenHash: unknown): void {
    if (typeof tokenHash !== 'string' || !TOKEN_HASH_REGEX.test(tokenHash)) {
      throw new InvalidArgumentException(
        '<EmailToken> tokenHash must be 64 lowercase hex characters'
      );
    }
  }

  private static ensureExpiresAt(expiresAt: unknown): void {
    if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
      throw new InvalidArgumentException(
        '<EmailToken> expiresAt must be a valid date'
      );
    }
  }
}
