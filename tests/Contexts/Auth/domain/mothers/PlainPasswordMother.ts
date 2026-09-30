import { PlainPassword } from '../../../../../src/Contexts/Auth/domain/value-objects/PlainPassword.js';

const VALID_PASSWORD = 'ValidPass1!';
// One character of each required class, all ASCII (1 byte each).
const BASE = 'Aa1!';

export class PlainPasswordMother {
  static create(value: string): PlainPassword {
    return new PlainPassword(value);
  }

  static valid(): PlainPassword {
    return new PlainPassword(VALID_PASSWORD);
  }

  static withLength(length: number, filler: string = 'a'): string {
    return BASE + filler.repeat(Math.max(0, length - BASE.length));
  }

  /** Strong password of `bytes` UTF-8 bytes (even), padded with 2-byte `ñ`. */
  static withBytes(bytes: number): string {
    return BASE + 'ñ'.repeat(Math.max(0, (bytes - BASE.length) / 2));
  }
}
