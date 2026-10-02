import { BedName } from '../../../../../src/Contexts/Agro/Beds/domain/BedName.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('BedName', () => {
  it('should trim surrounding whitespace', () => {
    // Act
    const name = new BedName('  Raised bed  ');

    // Assert
    expect(name.value).toBe('Raised bed');
  });

  it.each([[''], ['   '], ['\t\n']])(
    'should reject the blank name %j',
    (value) => {
      // Act
      const build = () => new BedName(value);

      // Assert
      expect(build).toThrow(InvalidArgumentException);
    }
  );
});
