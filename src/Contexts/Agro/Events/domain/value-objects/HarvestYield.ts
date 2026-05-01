import { createError } from '../../../../../shared/errors/index.js';

export class HarvestYield {
  private constructor(public readonly value: number) {}

  static create(value: number): HarvestYield {
    if (!Number.isFinite(value)) {
      throw createError.badRequest('Yield must be a number');
    }

    if (value <= 0) {
      throw createError.badRequest('Yield must be > 0');
    }

    return new HarvestYield(value);
  }
}
