import { familyExtra } from '../../../../../src/Contexts/Agro/Families/domain/FamilyExtra.js';
import type { FamilyExtraPrimitives } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyExtraPrimitives.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('familyExtra', () => {
  it.each([
    ['undefined', undefined],
    ['an object without keys', {}]
  ])('should return undefined for %s', (_label, extra) => {
    // Act
    const result = familyExtra(extra);

    // Assert
    expect(result).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a text', 'Rosales']
  ])('should reject %s naming its path', (_label, value) => {
    // Arrange
    const extra = value as unknown as FamilyExtraPrimitives;

    // Act
    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    // Assert
    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(/Family\.extra must be an object/);
  });

  it('should trim order and distribution', () => {
    // Arrange
    const extra = { order: '  Rosales ', distribution: ' Worldwide  ' };

    // Act
    const result = familyExtra(extra);

    // Assert
    expect(result).toEqual({ order: 'Rosales', distribution: 'Worldwide' });
  });

  it.each([
    ['order', { order: '   ' }],
    ['distribution', { distribution: '' }]
  ])('should reject a blank %s naming its path', (key, extra) => {
    // Act
    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    // Assert
    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(new RegExp(`Family\\.extra\\.${key}`));
  });

  it('should keep a positive integer species count', () => {
    // Act
    const result = familyExtra({ speciesCount: 3000 });

    // Assert
    expect(result).toEqual({ speciesCount: 3000 });
  });

  it.each([[0], [-1], [1.5]])(
    'should reject the species count %p',
    (speciesCount) => {
      // Act
      const act = (): FamilyExtraPrimitives | undefined =>
        familyExtra({ speciesCount });

      // Assert
      expect(act).toThrow(InvalidArgumentException);
      expect(act).toThrow(/Family\.extra\.speciesCount/);
    }
  );

  it('should normalise subfamilies with the text-list rule', () => {
    // Act
    const result = familyExtra({
      subfamilies: ['  Rosoideae ', '', 'rosoideae']
    });

    // Assert
    expect(result).toEqual({ subfamilies: ['Rosoideae'] });
  });

  it('should reject a non-string subfamily naming its index', () => {
    // Arrange
    const extra = {
      subfamilies: ['Rosoideae', 1]
    } as unknown as FamilyExtraPrimitives;

    // Act
    const act = (): FamilyExtraPrimitives | undefined => familyExtra(extra);

    // Assert
    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(/Family\.extra\.subfamilies\.1/);
  });

  it('should keep an extra whose only key is an empty subfamilies list', () => {
    // Act
    const result = familyExtra({ subfamilies: ['', '  '] });

    // Assert
    expect(result).toEqual({ subfamilies: [] });
  });

  it('should not mutate the input', () => {
    // Arrange
    const extra = { order: '  Rosales ' };

    // Act
    familyExtra(extra);

    // Assert
    expect(extra).toEqual({ order: '  Rosales ' });
  });
});
