import { diffObjects } from '../../../../src/shared/domain/diff/diffObjects.js';

describe('diffObjects', () => {
  it('sets primitive changes', () => {
    const current = { name: 'a' };
    const updated = { name: 'b' };

    const result = diffObjects(current, updated);

    expect(result.set.name).toBe('b');
  });

  it('does not unset a field that is already null', () => {
    const current = { name: 'x', deletedAt: null };
    const updated = { name: 'x', deletedAt: null };

    expect(diffObjects(current, updated)).toEqual({ set: {}, unset: {} });
  });

  it('unsets null values', () => {
    const current = { name: 'a' };
    const updated = { name: null };

    const result = diffObjects(current, updated);

    expect(result.unset.name).toBe('');
  });

  it('ignores undefined values', () => {
    const current = { name: 'a' };
    const updated = { name: undefined };

    const result = diffObjects(current, updated);

    expect(result.set.name).toBeUndefined();
    expect(result.unset.name).toBeUndefined();
  });

  it('recursively diffs nested objects', () => {
    const current = { size: { h: 1 } };
    const updated = { size: { h: 2 } };

    const result = diffObjects(current, updated);

    expect(result.set['size.h']).toBe(2);
  });

  it('replaces arrays entirely', () => {
    const current = { months: [1, 2] };
    const updated = { months: [3, 4] };

    const result = diffObjects(current, updated);

    expect(result.set.months).toEqual([3, 4]);
  });

  it('returns empty diff when values are identical', () => {
    const current = {
      name: 'a',
      size: { h: 1 }
    };

    const updated = {
      name: 'a',
      size: { h: 1 }
    };

    const result = diffObjects(current, updated);

    expect(result.set).toEqual({});
    expect(result.unset).toEqual({});
  });

  it('sets changed Date values as a whole', () => {
    const current = { deletedAt: new Date('2024-01-01T00:00:00.000Z') };
    const updated = { deletedAt: new Date('2024-06-01T00:00:00.000Z') };

    const result = diffObjects(current, updated);

    expect(result.set.deletedAt).toBe(updated.deletedAt);
  });

  it('ignores Date values with the same time', () => {
    const current = { deletedAt: new Date('2024-01-01T00:00:00.000Z') };
    const updated = { deletedAt: new Date('2024-01-01T00:00:00.000Z') };

    const result = diffObjects(current, updated);

    expect(result.set).toEqual({});
    expect(result.unset).toEqual({});
  });
});
