import { createError } from '../../../../shared/errors/index.js';

export class PositiveNumber {
  private constructor(public readonly value: number) {}

  public static create(value: number): PositiveNumber {
    if (!Number.isFinite(value)) {
      throw createError.badRequest('Value must be a number');
    }
    if (value <= 0) {
      throw createError.badRequest('Value must be a positive number');
    }
    return new PositiveNumber(value);
  }
}
