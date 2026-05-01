import { createError } from '../../../../../shared/errors/index.js';

export class WateringAmount {
  private constructor(public readonly value: number) {}

  static create(value: number): WateringAmount {
    if (!Number.isFinite(value)) {
      throw createError.badRequest('Watering amount must be a number');
    }

    if (value <= 0) {
      throw createError.badRequest('Watering amount must be > 0');
    }

    return new WateringAmount(value);
  }
}
