import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';

export class WateringAmount {
  private constructor(public readonly value: number) {}

  static create(value: number): WateringAmount {
    if (!Number.isFinite(value)) {
      throw new InvalidArgumentException('Watering amount must be a number');
    }

    if (value <= 0) {
      throw new InvalidArgumentException('Watering amount must be > 0');
    }

    return new WateringAmount(value);
  }
}
