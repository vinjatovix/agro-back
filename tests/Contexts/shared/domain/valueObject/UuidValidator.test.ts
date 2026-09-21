import { UuidValidator } from '../../../../../src/Contexts/shared/domain/valueObject/UuidValidator.js';
import { random } from '../../fixtures/random.js';

describe('UuidValidator', () => {
  it('should validate a correct uuid v4', () => {
    const validUuid = random.uuid();

    const result = UuidValidator.isValid(validUuid);

    expect(result).toBe(true);
  });

  it('should invalidate an incorrect uuid', () => {
    const invalidUuid = 'invalid-uuid';

    const result = UuidValidator.isValid(invalidUuid);

    expect(result).toBe(false);
  });
});
