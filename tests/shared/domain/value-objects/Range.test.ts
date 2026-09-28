import { Range } from '../../../../src/shared/domain/value-objects/Range.js';

describe('Range', () => {
  it('should create valid range', () => {
    const range = new Range(10, 20);

    expect(range.min).toBe(10);
    expect(range.max).toBe(20);
  });

  it('should throw if values are not finite', () => {
    expect(() => new Range(Number.NaN, 10)).toThrow();
    expect(() => new Range(10, Infinity)).toThrow();
  });

  it('should throw if values are negative', () => {
    expect(() => new Range(-1, 10)).toThrow();
    expect(() => new Range(10, -5)).toThrow();
  });

  it('should throw if min is greater than max', () => {
    expect(() => new Range(20, 10)).toThrow();
  });

  it('should check contains correctly', () => {
    const range = new Range(10, 20);

    expect(range.contains(10)).toBe(true);
    expect(range.contains(15)).toBe(true);
    expect(range.contains(20)).toBe(true);
    expect(range.contains(21)).toBe(false);
  });

  it('should detect overlap correctly', () => {
    const a = new Range(10, 20);
    const b = new Range(15, 25);
    const c = new Range(21, 30);

    expect(a.overlaps(b)).toBe(true);
    expect(a.overlaps(c)).toBe(false);
  });

  it('should calculate average', () => {
    const range = new Range(10, 20);

    expect(range.average).toBe(15);
  });

  it('should check equality', () => {
    const a = new Range(10, 20);
    const b = new Range(10, 20);
    const c = new Range(10, 21);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  describe('with', () => {
    it('keeps max when only min is given', () => {
      const range = new Range(10, 20);
      const result = range.with({ min: 5 });

      expect(result.min).toBe(5);
      expect(result.max).toBe(20);
    });

    it('keeps min when only max is given', () => {
      const range = new Range(10, 20);
      const result = range.with({ max: 30 });

      expect(result.min).toBe(10);
      expect(result.max).toBe(30);
    });

    it('returns an equal range when called with empty object', () => {
      const range = new Range(10, 20);
      const result = range.with({});

      expect(result.min).toBe(10);
      expect(result.max).toBe(20);
    });

    it('throws when min exceeds max', () => {
      const range = new Range(10, 20);

      expect(() => range.with({ min: 25 })).toThrow(
        'Range min cannot be greater than max'
      );
    });

    it('does not modify the original range', () => {
      const range = new Range(10, 20);
      range.with({ min: 5 });

      expect(range.min).toBe(10);
      expect(range.max).toBe(20);
    });
  });

  describe('fromPartial', () => {
    it('builds a range when both bounds are given', () => {
      const range = Range.fromPartial({ min: 2, max: 8 });

      expect(range.toPrimitives()).toEqual({ min: 2, max: 8 });
    });

    it.each([{ min: 2 }, { max: 8 }, {}])(
      'throws when a bound is missing (%o)',
      (partial) => {
        expect(() => Range.fromPartial(partial)).toThrow(/min and max/);
      }
    );

    it('names the incomplete range in the error', () => {
      expect(() => Range.fromPartial({ min: 2 }, 'knowledge.soil.ph')).toThrow(
        /knowledge\.soil\.ph/
      );
    });
  });
});
