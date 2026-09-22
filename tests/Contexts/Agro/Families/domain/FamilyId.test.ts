import {
  createFamilyId,
  randomFamilyId
} from '../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { random } from '../../../shared/fixtures/random.js';

describe('FamilyId', () => {
  const VALID_V4 = random.legacyUuid();
  const VALID_V7 = random.uuid();

  it.each([
    ['legacy UUIDv4', VALID_V4],
    ['UUIDv7', VALID_V7]
  ])('should create a valid FamilyId from %s', (_description, value) => {
    const result = createFamilyId(value);

    expect(result).toBe(value);
  });

  it('should throw an InvalidArgumentException when input is not a valid UUID', () => {
    const invalidValue = 'invalid-uuid';

    expect(() => createFamilyId(invalidValue)).toThrow(
      InvalidArgumentException
    );
  });

  it('should generate a valid random FamilyId using UUIDv7 format', () => {
    const result = randomFamilyId();

    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
