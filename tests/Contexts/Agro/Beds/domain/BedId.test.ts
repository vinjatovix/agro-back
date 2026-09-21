import {
  createBedId,
  randomBedId
} from '../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { random } from '../../../shared/fixtures/random.js';

describe('BedId', () => {
  it('should create a valid BedId when input is a valid UUID v4', () => {
    const value = random.uuid();

    const result = createBedId(value);

    expect(result).toBe(value);
  });

  it('should throw an InvalidArgumentException when input is not a valid UUID v4', () => {
    const invalidValue = 'invalid-uuid';

    expect(() => createBedId(invalidValue)).toThrow(InvalidArgumentException);
  });

  it('should generate a valid random BedId', () => {
    const result = randomBedId();

    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
