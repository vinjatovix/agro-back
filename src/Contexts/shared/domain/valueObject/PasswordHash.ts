import { createError } from '../../../../shared/errors/index.js';

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export class PasswordHash {
  readonly value: string;

  constructor(value: string) {
    PasswordHash.ensureIsValid(value);
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  private static ensureIsValid(value: string): void {
    if (typeof value !== 'string' || !BCRYPT_HASH_REGEX.test(value)) {
      throw createError.badRequest(
        `<PasswordHash> does not allow the value <${value}>`
      );
    }
  }
}
