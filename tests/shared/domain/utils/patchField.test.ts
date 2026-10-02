import {
  mergePatchField,
  patchField
} from '../../../../src/shared/domain/utils/patchField.js';

describe('patchField', () => {
  it.each([
    ['keep the current value when the change is absent', undefined, 'old'],
    ['remove the value on null', null, undefined],
    ['replace the value with the change', 'new', 'new']
  ])('should %s', (_, change, expected) => {
    expect(patchField<string>(change, 'old')).toBe(expected);
  });
});

describe('mergePatchField', () => {
  const merge = jest.fn(
    (change: number, current: number | undefined) => change + (current ?? 0)
  );

  beforeEach(() => merge.mockClear());

  it('should merge a given change into the current value', () => {
    expect(mergePatchField(2, 40, merge)).toBe(42);
  });

  it.each([
    ['absent', undefined, 40],
    ['null', null, undefined]
  ])('should not merge when the change is %s', (_, change, expected) => {
    expect(mergePatchField(change, 40, merge)).toBe(expected);
    expect(merge).not.toHaveBeenCalled();
  });
});
