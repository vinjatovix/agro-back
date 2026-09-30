import { hasStateChanged } from '../../../../src/shared/domain/diff/hasStateChanged.js';
import { MonthSet } from '../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../src/shared/domain/value-objects/Range.js';
import { InternalServerError } from '../../../../src/shared/errors/index.js';

describe('hasStateChanged', () => {
  it('returns false for equal plain snapshots', () => {
    const snapshot = () => ({
      name: 'bed',
      size: { width: 1, height: 2 },
      tags: ['a', 'b'],
      at: new Date('2024-01-01T00:00:00.000Z')
    });

    expect(hasStateChanged(snapshot(), snapshot())).toBe(false);
  });

  it('returns true when a field changes', () => {
    expect(hasStateChanged({ name: 'a' }, { name: 'b' })).toBe(true);
  });

  it('returns true when a nested field changes', () => {
    expect(
      hasStateChanged({ size: { width: 1 } }, { size: { width: 2 } })
    ).toBe(true);
  });

  it('returns true when an array changes', () => {
    expect(hasStateChanged({ tags: ['a'] }, { tags: ['a', 'b'] })).toBe(true);
  });

  it('returns true when a date changes', () => {
    expect(
      hasStateChanged(
        { at: new Date('2024-01-01T00:00:00.000Z') },
        { at: new Date('2024-01-02T00:00:00.000Z') }
      )
    ).toBe(true);
  });

  it('returns true when a field is set', () => {
    expect(hasStateChanged({}, { name: 'a' })).toBe(true);
  });

  it('returns true when a field is removed', () => {
    expect(hasStateChanged({ name: 'a' }, {})).toBe(true);
  });

  describe('plain snapshots only', () => {
    it('rejects a value object whose data is hidden from the diff', () => {
      // Different months, but a Set has no own keys: without the guard this
      // would read as "unchanged" and the change would be lost.
      expect(() =>
        hasStateChanged(
          { months: MonthSet.fromArray([3, 4]) },
          { months: MonthSet.fromArray([5, 6]) }
        )
      ).toThrow(InternalServerError);
    });

    it('rejects a value object nested in the after snapshot', () => {
      expect(() =>
        hasStateChanged(
          { size: { height: { min: 1, max: 2 } } },
          { size: { height: new Range(1, 2) } }
        )
      ).toThrow(InternalServerError);
    });

    it('rejects a value object inside an array', () => {
      expect(() =>
        hasStateChanged({ ranges: [] }, { ranges: [new Range(1, 2)] })
      ).toThrow(InternalServerError);
    });

    it('rejects an object whose prototype has no constructor', () => {
      const snapshot = Object.create(Object.create(null) as object) as object;

      expect(() => hasStateChanged({ snapshot }, { snapshot })).toThrow(
        InternalServerError
      );
    });

    it('accepts null-prototype objects', () => {
      const snapshot = Object.assign(Object.create(null) as object, {
        name: 'a'
      });

      expect(hasStateChanged({ snapshot }, { snapshot })).toBe(false);
    });
  });
});
