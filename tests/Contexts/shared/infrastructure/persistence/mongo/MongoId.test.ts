import { Binary, UUID } from 'bson';
import {
  toMongoId,
  fromMongoId
} from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../fixtures/random.js';

describe('MongoId helpers', () => {
  const VALID_V4 = random.legacyUuid();
  const VALID_V7 = random.uuid();
  const invalidUuid = 'not-a-uuid';

  describe('toMongoId', () => {
    it.each([
      ['legacy UUIDv4', VALID_V4],
      ['UUIDv7', VALID_V7]
    ])('should convert %s string to Binary', (_description, value) => {
      const result = toMongoId(value);

      expect(result).toBeInstanceOf(Binary);
      expect((result as Binary).sub_type).toBe(Binary.SUBTYPE_UUID);
    });

    it('should return non-UUID string as is', () => {
      const result = toMongoId(invalidUuid);

      expect(result).toBe(invalidUuid);
      expect(typeof result).toBe('string');
    });

    it('should handle UUID string with whitespace', () => {
      const uuidWithSpaces = `  ${VALID_V7}  `;
      const result = toMongoId(uuidWithSpaces);

      expect(typeof result).toBe('string');
    });
  });

  describe('fromMongoId', () => {
    it('should return string id as is', () => {
      const result = fromMongoId(invalidUuid);

      expect(result).toBe(invalidUuid);
    });

    it.each([
      ['legacy UUIDv4', VALID_V4],
      ['UUIDv7', VALID_V7]
    ])('should convert %s UUID instance to string', (_description, value) => {
      const uuid = new UUID(value);
      const result = fromMongoId(uuid);

      expect(result).toBe(value);
    });

    it.each([
      ['legacy UUIDv4', VALID_V4],
      ['UUIDv7', VALID_V7]
    ])('should convert %s Binary UUID to string', (_description, value) => {
      const binary = new UUID(value).toBinary();
      const result = fromMongoId(binary);

      expect(result).toBe(value);
    });

    it('should convert non-UUID Binary to string', () => {
      const nonUuidBinary = new Binary(Buffer.from('test'), 0);
      const result = fromMongoId(nonUuidBinary);

      expect(result).toBe(nonUuidBinary.toString());
    });

    it('should fallback to String() for unknown types', () => {
      const number = 12345;
      const result = fromMongoId(number);

      expect(result).toBe('12345');
    });

    it('should handle null by converting to string', () => {
      const result = fromMongoId(null);

      expect(result).toBe('null');
    });

    it('should handle undefined by converting to string', () => {
      const result = fromMongoId(undefined);

      expect(result).toBe('undefined');
    });
  });

  describe('toMongoId and fromMongoId round-trip', () => {
    it.each([
      ['legacy UUIDv4', VALID_V4],
      ['UUIDv7', VALID_V7]
    ])('should round-trip %s through both functions', (_description, value) => {
      const mongoId = toMongoId(value);
      const result = fromMongoId(mongoId);

      expect(result).toBe(value);
    });

    it('should round-trip non-UUID string through both functions', () => {
      const mongoId = toMongoId(invalidUuid);
      const result = fromMongoId(mongoId);

      expect(result).toBe(invalidUuid);
    });
  });
});
