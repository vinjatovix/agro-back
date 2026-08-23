import { validate, v4 as uuidv4 } from 'uuid';
import { InvalidArgumentException } from '../errors/index.js';

export class Uuid {
  readonly value: string;

  constructor(value: string) {
    const normalizedValue = Uuid.normalize(value);
    Uuid.ensureIsValidUuid(normalizedValue);
    this.value = normalizedValue;
  }

  toString(): string {
    return this.value;
  }

  static random(): Uuid {
    return new Uuid(uuidv4());
  }

  equals(other: Uuid): boolean {
    return this.value === other.value;
  }

  private static normalize(value: string): string {
    return value.trim();
  }

  private static ensureIsValidUuid(id: string): void {
    if (!Uuid.isValid(id)) {
      throw new InvalidArgumentException(
        `<Uuid> does not allow the value <${id}>`
      );
    }
  }

  static create(value: string): Uuid {
    return new Uuid(value);
  }

  static isValid(value: string): boolean {
    return validate(value.trim());
  }
}
