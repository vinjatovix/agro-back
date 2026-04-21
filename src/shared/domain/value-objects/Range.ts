import type { Serializable } from '../../../Contexts/shared/domain/interfaces/Serializable.js';
import type { RangePrimitives } from './interfaces/RangePrimitives.js';

export class Range implements Serializable<RangePrimitives> {
  public readonly min: number;
  public readonly max: number;

  constructor(min: number, max: number) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new TypeError('Range values must be finite numbers');
    }

    if (min < 0 || max < 0) {
      throw new Error('Range values cannot be negative');
    }

    if (min > max) {
      throw new Error('Range min cannot be greater than max');
    }

    this.min = min;
    this.max = max;
  }

  static single(value: number): Range {
    return new Range(value, value);
  }

  contains(value: number): boolean {
    return value >= this.min && value <= this.max;
  }

  overlaps(other: Range): boolean {
    return this.min <= other.max && other.min <= this.max;
  }

  get average(): number {
    return (this.min + this.max) / 2;
  }

  equals(other: Range): boolean {
    return this.min === other.min && this.max === other.max;
  }

  toPrimitives(): RangePrimitives {
    return { min: this.min, max: this.max };
  }
}
