import { createError } from '../../../../shared/errors/index.js';

export class PlainPassword {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 72;
  private static readonly RULES: Array<{ regex: RegExp; message: string }> = [
    { regex: /[A-Z]/, message: 'at least one uppercase letter' },
    { regex: /[a-z]/, message: 'at least one lowercase letter' },
    { regex: /\d/, message: 'at least one digit' },
    { regex: /[^A-Za-z0-9]/, message: 'at least one special character' }
  ];
  readonly value: string;

  constructor(value: string) {
    PlainPassword.ensureIsValid(value);
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PlainPassword): boolean {
    return this.value === other.value;
  }

  private static ensureIsValid(value: string): void {
    if (typeof value !== 'string') {
      throw createError.badRequest(
        `<PlainPassword> does not allow the value <${value}>`
      );
    }

    if (value.length < PlainPassword.MIN_LENGTH) {
      throw createError.badRequest(
        `<PlainPassword> must be at least ${PlainPassword.MIN_LENGTH} characters long`
      );
    }

    if (value.length > PlainPassword.MAX_LENGTH) {
      throw createError.badRequest(
        `<PlainPassword> must be less than ${PlainPassword.MAX_LENGTH} characters long`
      );
    }

    for (const { regex, message } of PlainPassword.RULES) {
      if (!regex.test(value)) {
        throw createError.badRequest(`<PlainPassword> must include ${message}`);
      }
    }
  }
}
