import {
  hasKeysMatching,
  hasOnlyKeys
} from '../../../../src/apps/agroApi/middlewares/helpers/index.js';

describe('objectKeys validators', () => {
  describe('hasOnlyKeys', () => {
    const isValid = hasOnlyKeys(['frequency', 'conditions']);

    it('accepts an object with only allowed keys', () => {
      expect(isValid({ frequency: 'weekly' })).toBe(true);
    });

    it('rejects an object with an unknown key', () => {
      expect(isValid({ frequency: 'weekly', amountMm: 10 })).toBe(false);
    });

    it('leaves non-objects to the type validator', () => {
      expect(isValid('weekly')).toBe(true);
    });
  });

  describe('hasKeysMatching', () => {
    const isValid = hasKeysMatching(/^[a-z][a-zA-Z]*$/);

    it('accepts camelCase keys', () => {
      expect(isValid({ seed: {}, rootCutting: {} })).toBe(true);
    });

    it.each(['a.b', '', '$set', '__proto__', 'root_cutting'])(
      'rejects the key %p',
      (key) => {
        expect(isValid({ [key]: {} })).toBe(false);
      }
    );
  });
});
