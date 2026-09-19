import type { CoordinatesPrimitives } from './interfaces/CoordinatesPrimitives.js';

export class Coordinates {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError('Coordinates must be finite numbers');
    }
  }

  distanceTo(other: Coordinates): number {
    return Math.sqrt(
      Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2)
    );
  }

  equals(other: Coordinates): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toPrimitives(): CoordinatesPrimitives {
    return {
      x: this.x,
      y: this.y
    };
  }

  static fromPrimitives(p: CoordinatesPrimitives): Coordinates {
    return new Coordinates(p.x, p.y);
  }
}
