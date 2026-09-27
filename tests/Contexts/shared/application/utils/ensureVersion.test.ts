import { ensureVersion } from '../../../../../src/Contexts/shared/application/utils/ensureVersion.js';
import {
  DomainConflictException,
  DomainStaleVersionException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('ensureVersion', () => {
  const entityName = 'Widget';
  const id = 'widget-id';

  it.each([
    [0, 0],
    [3, 3]
  ])(
    'should not throw when actual %p equals expected %p',
    (actual, expected) => {
      expect(() =>
        ensureVersion(actual, expected, entityName, id)
      ).not.toThrow();
    }
  );

  it.each([
    [1, 0],
    [0, 1],
    [4, 3]
  ])(
    'should throw DomainStaleVersionException when actual %p differs from expected %p',
    (actual, expected) => {
      let thrown: unknown;
      try {
        ensureVersion(actual, expected, entityName, id);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainStaleVersionException);
      expect(thrown).not.toBeInstanceOf(DomainConflictException);
      expect((thrown as DomainStaleVersionException).message).toContain(id);
    }
  );
});
