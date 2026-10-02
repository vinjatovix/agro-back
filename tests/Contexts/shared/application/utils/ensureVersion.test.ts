import { ensureVersion } from '../../../../../src/Contexts/shared/application/utils/ensureVersion.js';
import {
  DomainConflictException,
  DomainStaleVersionException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('ensureVersion', () => {
  const entityName = 'Widget';
  const id = 'widget-id';

  it.each([
    [0, [0]],
    [3, [3]],
    [3, [2, 3]],
    [2, [2, 3]]
  ])(
    'should not throw when actual %p is in the expected versions %j',
    (actual, expectedVersions) => {
      expect(() =>
        ensureVersion(actual, expectedVersions, entityName, id)
      ).not.toThrow();
    }
  );

  it.each([
    [1, [0]],
    [0, [1]],
    [4, [2, 3]],
    [0, []]
  ])(
    'should throw DomainStaleVersionException when actual %p is not in %j',
    (actual, expectedVersions) => {
      let thrown: unknown;
      try {
        ensureVersion(actual, expectedVersions, entityName, id);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainStaleVersionException);
      expect(thrown).not.toBeInstanceOf(DomainConflictException);
      expect((thrown as DomainStaleVersionException).message).toContain(id);
      expect((thrown as DomainStaleVersionException).message).toContain(
        entityName
      );
    }
  );
});
