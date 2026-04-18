import { createError } from '../../../../shared/errors/index.js';

export class StringValueObject {
  readonly value: string;

  constructor(value: string) {
    this.value = StringValueObject.ensureType(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: StringValueObject): boolean {
    return this.value === other.value;
  }

  protected static ensureType(value: unknown): string {
    if (typeof value !== 'string') {
      throw createError.badRequest(
        `<${this.name}> does not allow the value <${String(value)}>`
      );
    }

    return value.trim();
  }

  protected static ensureLength(
    value: string,
    minLength: number,
    maxLength: number
  ): string {
    const normalizedValue = this.ensureType(value);

    if (
      normalizedValue.length < minLength ||
      normalizedValue.length > maxLength
    ) {
      const message =
        normalizedValue.length < minLength
          ? `less than ${minLength}`
          : `more than ${maxLength}`;

      throw createError.badRequest(
        `<${this.name}> <${value}> has ${message} characters`
      );
    }

    return normalizedValue;
  }
}
