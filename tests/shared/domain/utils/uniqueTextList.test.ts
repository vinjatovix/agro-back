import { InvalidArgumentException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { uniqueTextList } from '../../../../src/shared/domain/utils/uniqueTextList.js';

const PATH = 'Family.aliases';

describe('uniqueTextList', () => {
  it.each([
    ['trims every entry', [' a1 ', 'a2  '], ['a1', 'a2']],
    ['drops blank entries', ['a1', '', '   ', 'a2'], ['a1', 'a2']],
    [
      'drops case-insensitive duplicates keeping the first occurrence',
      ['Rose family', ' rose family ', '', 'Roses'],
      ['Rose family', 'Roses']
    ],
    ['returns an empty list when every entry is blank', ['', '   '], []],
    ['returns an empty list for an empty list', [], []]
  ])('%s', (_label, values, expected) => {
    // Act
    const result = uniqueTextList(values, PATH);

    // Assert
    expect(result).toEqual(expected);
  });

  it('should not mutate the input list', () => {
    // Arrange
    const values = [' a1 ', 'A1', ''];
    const copy = [...values];

    // Act
    uniqueTextList(values, PATH);

    // Assert
    expect(values).toEqual(copy);
  });

  it.each([
    ['a number', 1],
    ['null', null],
    ['an object', {}]
  ])('should reject %s entry naming its index', (_label, entry) => {
    // Arrange
    const values = ['Rose family', entry];

    // Act
    const act = (): string[] => uniqueTextList(values, PATH);

    // Assert
    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(/Family\.aliases\.1/);
  });
});
