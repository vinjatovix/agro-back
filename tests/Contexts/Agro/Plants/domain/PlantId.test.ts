import {
  createPlantId,
  randomPlantId
} from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';

describe('PlantId', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should create a valid PlantId when input is a valid UUID v4', () => {
    // Arrange
    const value = VALID_UUID;

    // Act
    const result = createPlantId(value);

    // Assert
    expect(result).toBe(value);
  });

  it('should throw an InvalidArgumentException when input is not a valid UUID v4', () => {
    // Arrange
    const invalidValue = 'invalid-uuid';

    // Act & Assert
    expect(() => createPlantId(invalidValue)).toThrow(InvalidArgumentException);
  });

  it('should generate a valid random PlantId', () => {
    // Arrange & Act
    const result = randomPlantId();

    // Assert
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
