import { familyExtra } from '../../../../../src/Contexts/Agro/Families/domain/FamilyExtra.js';
import type { FamilyExtraPrimitives } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyExtraPrimitives.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('familyExtra', () => {
  it.each([
    ['undefined', undefined],
    ['an object without keys', {}]
  ])('should return undefined for %s', (_label, extra) => {
    const result = familyExtra(extra);

    expect(result).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a text', 'Rosales']
  ])('should reject %s naming its path', (_label, value) => {
    const extra = value as unknown as FamilyExtraPrimitives;

    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(/Family\.extra must be an object/);
  });

  it('should trim order and distribution', () => {
    const extra = { order: '  Rosales ', distribution: ' Worldwide  ' };

    const result = familyExtra(extra);

    expect(result).toEqual({ order: 'Rosales', distribution: 'Worldwide' });
  });

  it.each([
    ['order', { order: '   ' }],
    ['distribution', { distribution: '' }]
  ])('should reject a blank %s naming its path', (key, extra) => {
    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(new RegExp(`Family\\.extra\\.${key}`));
  });

  it('should keep a positive integer species count', () => {
    const result = familyExtra({ speciesCount: 3000 });

    expect(result).toEqual({ speciesCount: 3000 });
  });

  it.each([[0], [-1], [1.5]])(
    'should reject the species count %p',
    (speciesCount) => {
      const act = (): FamilyExtraPrimitives | undefined =>
        familyExtra({ speciesCount });

      expect(act).toThrow(InvalidArgumentException);
      expect(act).toThrow(/Family\.extra\.speciesCount/);
    }
  );

  it('should normalise subfamilies with the text-list rule', () => {
    const result = familyExtra({
      subfamilies: ['  Rosoideae ', '', 'rosoideae']
    });

    expect(result).toEqual({ subfamilies: ['Rosoideae'] });
  });

  it('should reject a non-string subfamily naming its index', () => {
    const extra = {
      subfamilies: ['Rosoideae', 1]
    } as unknown as FamilyExtraPrimitives;

    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(/Family\.extra\.subfamilies\.1/);
  });

  it('should keep an extra whose only key is an empty subfamilies list', () => {
    const result = familyExtra({ subfamilies: ['', '  '] });

    expect(result).toEqual({ subfamilies: [] });
  });

  it('should not mutate the input', () => {
    const extra = { order: '  Rosales ' };

    familyExtra(extra);

    expect(extra).toEqual({ order: '  Rosales ' });
  });
});
