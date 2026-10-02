import { InvalidArgumentException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { requiredText } from '../../../../src/shared/domain/utils/requiredText.js';

describe('requiredText', () => {
  it('should trim the text', () => {
    expect(requiredText('  Tomato  ', 'identity.name.primary')).toBe('Tomato');
  });

  it.each([
    ['empty', ''],
    ['blank', '   ']
  ])('should reject an %s text naming its path', (_, value) => {
    expect(() => requiredText(value, 'identity.name.primary')).toThrow(
      InvalidArgumentException
    );
    expect(() => requiredText(value, 'identity.name.primary')).toThrow(
      /identity\.name\.primary/
    );
  });
});
