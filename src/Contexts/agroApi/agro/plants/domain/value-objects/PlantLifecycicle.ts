export type PlantLifecycleValue = 'annual' | 'biennial' | 'perennial';

export class PlantLifecycle {
  private constructor(private readonly value: PlantLifecycleValue) {}

  static from(value: PlantLifecycleValue): PlantLifecycle {
    return new PlantLifecycle(value);
  }

  getValue(): PlantLifecycleValue {
    return this.value;
  }

  equals(other: PlantLifecycle): boolean {
    return this.value === other.value;
  }
}
