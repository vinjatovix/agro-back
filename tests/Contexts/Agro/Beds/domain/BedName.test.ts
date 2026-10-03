import { BedName } from '../../../../../src/Contexts/Agro/Beds/domain/BedName.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('BedName', () => {
  it('should trim surrounding whitespace', () => {
    const name = new BedName('  Raised bed  ');

    expect(name.value).toBe('Raised bed');
  });

  it.each([[''], ['   '], ['\t\n']])(
    'should reject the blank name %j',
    (value) => {
      const build = () => new BedName(value);

      expect(build).toThrow(InvalidArgumentException);
    }
  );
});
