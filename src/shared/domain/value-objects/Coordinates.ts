export class Coordinates {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Coordinates must be finite numbers');
    }
    Object.freeze(this);
  }

  distanceTo(other: Coordinates): number {
    return Math.sqrt(
      Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2)
    );
  }

  equals(other: Coordinates): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
