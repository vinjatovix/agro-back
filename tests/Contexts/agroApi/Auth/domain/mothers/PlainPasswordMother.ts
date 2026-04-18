import { PlainPassword } from '../../../../../../src/Contexts/agroApi/Auth/domain/PlainPassword.js';

const VALID_PASSWORD = 'ValidPass1!';

export class PlainPasswordMother {
  static create(value: string): PlainPassword {
    return new PlainPassword(value);
  }

  static valid(): PlainPassword {
    return new PlainPassword(VALID_PASSWORD);
  }

  static withLength(length: number): string {
    const base = 'Aa1!';
    return base + 'a'.repeat(Math.max(0, length - base.length));
  }
}
