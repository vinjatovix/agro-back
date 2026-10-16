import { randomBytes } from 'node:crypto';

import {
  ACTIVATION_TOKEN_TTL_MS,
  EmailToken
} from '../../../../../src/Contexts/Auth/domain/value-objects/EmailToken.js';
import type {
  EmailTokenPrimitives,
  EmailTokenPurpose
} from '../../../../../src/Contexts/Auth/domain/value-objects/types/index.js';

const HOUR_MS = 60 * 60 * 1000;

export class EmailTokenMother {
  /** 64 lowercase hex characters, the shape of a SHA-256 digest. */
  static randomHash(): string {
    return randomBytes(32).toString('hex');
  }

  static activation({
    tokenHash,
    expiresAt
  }: { tokenHash?: string; expiresAt?: Date } = {}): EmailToken {
    return EmailToken.create({
      purpose: 'activation',
      tokenHash: tokenHash ?? EmailTokenMother.randomHash(),
      expiresAt: expiresAt ?? new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS)
    });
  }

  /** An activation token that expired one hour before `at`. */
  static expiredActivation(at: Date = new Date()): EmailToken {
    return EmailTokenMother.activation({
      expiresAt: new Date(at.getTime() - HOUR_MS)
    });
  }

  static passwordReset({
    tokenHash,
    expiresAt
  }: { tokenHash?: string; expiresAt?: Date } = {}): EmailToken {
    return EmailToken.create({
      purpose: 'passwordReset',
      tokenHash: tokenHash ?? EmailTokenMother.randomHash(),
      expiresAt: expiresAt ?? new Date(Date.now() + HOUR_MS)
    });
  }

  static validPrimitives(): EmailTokenPrimitives {
    return EmailTokenMother.activation().toPrimitives();
  }

  /** Each entry breaks exactly one rule of a valid token. */
  static invalidPrimitives(): Array<[string, EmailTokenPrimitives]> {
    const valid = EmailTokenMother.validPrimitives();
    const hash = EmailTokenMother.randomHash();

    return [
      [
        'an unknown purpose',
        { ...valid, purpose: 'newsletter' as EmailTokenPurpose }
      ],
      ['a 63-character hash', { ...valid, tokenHash: hash.slice(1) }],
      ['an uppercase hash', { ...valid, tokenHash: `A${hash.slice(1)}` }],
      ['an invalid date', { ...valid, expiresAt: new Date('not a date') }]
    ];
  }
}
