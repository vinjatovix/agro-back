export class MonthSet {
  private readonly months: Set<number>;

  constructor(months: number[]) {
    if (!Array.isArray(months)) {
      throw new TypeError('MonthSet must be an array');
    }

    const normalized = months.map((m) => {
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new Error(`Invalid month: ${m}`);
      }
      return m;
    });

    this.months = new Set(normalized);
  }

  static empty(): MonthSet {
    return new MonthSet([]);
  }

  static allYear(): MonthSet {
    return new MonthSet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  }

  has(month: number): boolean {
    return this.months.has(month);
  }

  add(month: number): MonthSet {
    return new MonthSet([...this.months, month]);
  }

  union(other: MonthSet): MonthSet {
    return new MonthSet([...this.months, ...other.months]);
  }

  intersection(other: MonthSet): MonthSet {
    return new MonthSet([...this.months].filter((m) => other.months.has(m)));
  }

  toArray(): number[] {
    return [...this.months].sort((a, b) => a - b);
  }

  equals(other: MonthSet): boolean {
    return this.toArray().join() === other.toArray().join();
  }
}
