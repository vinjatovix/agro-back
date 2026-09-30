import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';

export class PlainPassword {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 64;
  // bcrypt ignores every byte after the 72nd, so longer UTF-8 input would be
  // silently truncated.
  static readonly MAX_BYTES = 72;
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

  private static ensureIsValid(value: unknown): void {
    if (typeof value !== 'string') {
      throw new InvalidArgumentException(
        `<PlainPassword> does not allow the value <${String(value)}>`
      );
    }

    // Counted in code points, so an emoji is one character.
    const length = Array.from(value).length;

    if (length < PlainPassword.MIN_LENGTH) {
      throw new InvalidArgumentException(
        `<PlainPassword> must be at least ${PlainPassword.MIN_LENGTH} characters long`
      );
    }

    if (length > PlainPassword.MAX_LENGTH) {
      throw new InvalidArgumentException(
        `<PlainPassword> must be at most ${PlainPassword.MAX_LENGTH} characters long`
      );
    }

    if (new TextEncoder().encode(value).length > PlainPassword.MAX_BYTES) {
      throw new InvalidArgumentException(
        `<PlainPassword> must be at most ${PlainPassword.MAX_BYTES} bytes long in UTF-8`
      );
    }

    for (const { regex, message } of PlainPassword.RULES) {
      if (!regex.test(value)) {
        throw new InvalidArgumentException(
          `<PlainPassword> must include ${message}`
        );
      }
    }
  }
}
