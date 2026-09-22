import {
  createPlantId,
  randomPlantId
} from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { random } from '../../../shared/fixtures/random.js';

describe('PlantId', () => {
  const VALID_V4 = random.legacyUuid();
  const VALID_V7 = random.uuid();

  it.each([
    ['legacy UUIDv4', VALID_V4],
    ['UUIDv7', VALID_V7]
  ])('should create a valid PlantId from %s', (_description, value) => {
    const result = createPlantId(value);

    expect(result).toBe(value);
  });

  it('should throw an InvalidArgumentException when input is not a valid UUID', () => {
    const invalidValue = 'invalid-uuid';

    expect(() => createPlantId(invalidValue)).toThrow(InvalidArgumentException);
  });

  it('should generate a valid random PlantId using UUIDv7 format', () => {
    const result = randomPlantId();

    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
