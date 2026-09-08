import { resolveDiffAction } from '../../../../src/shared/domain/diff/resolveDiffAction.js';

describe('resolveDiffAction', () => {
  it('returns noop when updated is undefined', () => {
    expect(resolveDiffAction(1, undefined)).toBe('noop');
  });

  it('returns unset when updated is null', () => {
    expect(resolveDiffAction(1, null)).toBe('unset');
  });

  it('returns replace when updated is array', () => {
    expect(resolveDiffAction([], [1, 2])).toBe('replace');
  });

  it('returns set when current is undefined', () => {
    expect(resolveDiffAction(undefined, 'x')).toBe('set');
  });

  it('returns set for primitives change', () => {
    expect(resolveDiffAction('a', 'b')).toBe('set');
  });
});
