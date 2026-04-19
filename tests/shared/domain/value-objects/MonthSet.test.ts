import { MonthSet } from '../../../../src/shared/domain/value-objects/MonthSet.js';

describe('MonthSet', () => {
  it('should create valid MonthSet', () => {
    const set = new MonthSet([1, 3, 5]);

    expect(set.has(1)).toBe(true);
    expect(set.has(2)).toBe(false);
  });

  it('should throw if not array', () => {
    expect(() => new MonthSet(null as unknown as number[])).toThrow();
  });

  it('should throw for invalid months', () => {
    expect(() => new MonthSet([0])).toThrow();
    expect(() => new MonthSet([13])).toThrow();
    expect(() => new MonthSet([1.5])).toThrow();
  });

  it('should create empty set', () => {
    const set = MonthSet.empty();

    expect(set.toArray()).toEqual([]);
  });

  it('should create full year set', () => {
    const set = MonthSet.allYear();

    expect(set.toArray().length).toBe(12);
    expect(set.has(1)).toBe(true);
    expect(set.has(12)).toBe(true);
  });

  it('should add month immutably', () => {
    const set = new MonthSet([1, 2]);
    const newSet = set.add(3);

    expect(set.has(3)).toBe(false);
    expect(newSet.has(3)).toBe(true);
  });

  it('should union sets', () => {
    const a = new MonthSet([1, 2]);
    const b = new MonthSet([2, 3]);

    const result = a.union(b);

    expect(result.toArray()).toEqual([1, 2, 3]);
  });

  it('should intersect sets', () => {
    const a = new MonthSet([1, 2, 3]);
    const b = new MonthSet([2, 3, 4]);

    const result = a.intersection(b);

    expect(result.toArray()).toEqual([2, 3]);
  });

  it('should check equality', () => {
    const a = new MonthSet([1, 2]);
    const b = new MonthSet([2, 1]);

    expect(a.equals(b)).toBe(true);
  });
});
