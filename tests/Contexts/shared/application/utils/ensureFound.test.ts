import { ensureFound } from '../../../../../src/Contexts/shared/application/utils/ensureFound.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('ensureFound', () => {
  const entityName = 'Widget';
  const key = 'widget-key';

  it('should return the same reference when the value is not null', () => {
    const value = { id: key };

    const result = ensureFound(value, entityName, key);

    expect(result).toBe(value);
  });

  it.each([[0], [''], [false]])(
    'should return the falsy but non-null value %p',
    (value) => {
      expect(ensureFound(value, entityName, key)).toBe(value);
    }
  );

  it('should throw DomainNotFoundException when the value is null', () => {
    const expectedMessage = `${entityName} not found: ${key}`;

    let thrown: unknown;
    try {
      ensureFound(null, entityName, key);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DomainNotFoundException);
    expect((thrown as DomainNotFoundException).message).toBe(expectedMessage);
  });

  it('should include the key name in the message when keyName is provided', () => {
    const keyName = 'slug';
    const expectedMessage = `${entityName} not found with ${keyName}: ${key}`;

    let thrown: unknown;
    try {
      ensureFound(null, entityName, key, keyName);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DomainNotFoundException);
    expect((thrown as DomainNotFoundException).message).toBe(expectedMessage);
  });
});
