import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';

export class HarvestYield {
  private constructor(public readonly value: number) {}

  static create(value: number): HarvestYield {
    if (!Number.isFinite(value)) {
      throw new InvalidArgumentException('Yield must be a number');
    }

    if (value <= 0) {
      throw new InvalidArgumentException('Yield must be > 0');
    }

    return new HarvestYield(value);
  }
}
