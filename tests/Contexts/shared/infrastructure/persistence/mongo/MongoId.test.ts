import { Binary, UUID } from 'bson';
import { toMongoId, fromMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

describe('MongoId helpers', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const invalidUuid = 'not-a-uuid';

  describe('toMongoId', () => {
    it('should convert valid UUID string to Binary', () => {
      const result = toMongoId(validUuid);

      expect(result).toBeInstanceOf(Binary);
      expect((result as Binary).sub_type).toBe(Binary.SUBTYPE_UUID);
    });

    it('should return non-UUID string as is', () => {
      const result = toMongoId(invalidUuid);

      expect(result).toBe(invalidUuid);
      expect(typeof result).toBe('string');
    });

    it('should handle UUID string with whitespace', () => {
      const uuidWithSpaces = `  ${validUuid}  `;
      const result = toMongoId(uuidWithSpaces);

      // UUID validation trims, so this should be treated as invalid
      expect(typeof result).toBe('string');
    });
  });

  describe('fromMongoId', () => {
    it('should return string id as is', () => {
      const result = fromMongoId(invalidUuid);

      expect(result).toBe(invalidUuid);
    });

    it('should convert UUID instance to string', () => {
      const uuid = new UUID(validUuid);
      const result = fromMongoId(uuid);

      expect(result).toBe(validUuid);
    });

    it('should convert Binary UUID to string', () => {
      const binary = new UUID(validUuid).toBinary();
      const result = fromMongoId(binary);

      expect(result).toBe(validUuid);
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
    it('should round-trip valid UUID through both functions', () => {
      const mongoId = toMongoId(validUuid);
      const result = fromMongoId(mongoId);

      expect(result).toBe(validUuid);
    });

    it('should round-trip non-UUID string through both functions', () => {
      const mongoId = toMongoId(invalidUuid);
      const result = fromMongoId(mongoId);

      expect(result).toBe(invalidUuid);
    });
  });
});
