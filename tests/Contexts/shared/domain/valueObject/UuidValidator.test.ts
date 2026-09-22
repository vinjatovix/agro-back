import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';
import { UuidValidator } from '../../../../../src/Contexts/shared/domain/valueObject/UuidValidator.js';
import { random } from '../../fixtures/random.js';

describe('UuidValidator', () => {
  const VALID_V4 = random.legacyUuid();
  const VALID_V7 = random.uuid();

  describe('isValid', () => {
    it.each([
      ['UUIDv4 constant', VALID_V4],
      ['UUIDv7 constant', VALID_V7],
      ['dynamically generated UUIDv4', uuidv4()],
      ['dynamically generated UUIDv7', uuidv7()],
      ['UUID with surrounding whitespace', `  ${VALID_V7}  `]
    ])(
      'should return true for valid identifier (%s)',
      (_description, value) => {
        const result = UuidValidator.isValid(value);

        expect(result).toBe(true);
      }
    );

    it.each([
      ['empty string', ''],
      ['non-hex characters', 'not-a-valid-uuid'],
      ['truncated UUID', '550e8400-e29b-41d4-a716'],
      ['too long UUID', `${VALID_V4}-extra`],
      ['invalid hyphens placement', '550e8400e29b41d4a716446655440000']
    ])(
      'should return false for invalid identifier (%s)',
      (_description, value) => {
        const result = UuidValidator.isValid(value);

        expect(result).toBe(false);
      }
    );
  });

  describe('isValidV4', () => {
    it('should return true for a valid UUIDv4', () => {
      const value = VALID_V4;

      const result = UuidValidator.isValidV4(value);

      expect(result).toBe(true);
    });

    it('should return false for a UUIDv7', () => {
      const value = VALID_V7;

      const result = UuidValidator.isValidV4(value);

      expect(result).toBe(false);
    });

    it('should return false for an invalid UUID string', () => {
      const value = 'invalid-uuid';

      const result = UuidValidator.isValidV4(value);

      expect(result).toBe(false);
    });
  });

  describe('isValidV7', () => {
    it('should return true for a valid UUIDv7', () => {
      const value = VALID_V7;

      const result = UuidValidator.isValidV7(value);

      expect(result).toBe(true);
    });

    it('should return false for a UUIDv4', () => {
      const value = VALID_V4;

      const result = UuidValidator.isValidV7(value);

      expect(result).toBe(false);
    });

    it('should return false for an invalid UUID string', () => {
      const value = 'invalid-uuid';

      const result = UuidValidator.isValidV7(value);

      expect(result).toBe(false);
    });
  });
});
