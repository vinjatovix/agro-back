import { InvalidArgumentException } from '../errors/index.js';

export class PositiveNumber {
  private constructor(public readonly value: number) {}

  public static create(value: number): PositiveNumber {
    if (!Number.isFinite(value)) {
      throw new InvalidArgumentException('Value must be a number');
    }
    if (value <= 0) {
      throw new InvalidArgumentException('Value must be a positive number');
    }
    return new PositiveNumber(value);
  }
}
