import { Uuid } from '../../../../../src/Contexts/shared/domain/valueObject/Uuid.js';

describe('Uuid', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const ANOTHER_VALID_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  describe('constructor', () => {
    it('should create a valid UUID value object', () => {
      const uuid = new Uuid(VALID_UUID);
      expect(uuid.value).toBe(VALID_UUID);
    });

    it('should trim whitespace from input', () => {
      const uuid = new Uuid(`  ${VALID_UUID}  `);
      expect(uuid.value).toBe(VALID_UUID);
    });

    it('should throw when value is not a valid UUID', () => {
      expect(() => new Uuid('not-a-uuid')).toThrow(
        '<Uuid> does not allow the value <not-a-uuid>'
      );
    });

    it('should throw when value is an empty string', () => {
      expect(() => new Uuid('')).toThrow('<Uuid> does not allow the value <>');
    });

    it('should throw when value is invalid UUID format', () => {
      const invalidUuid = '550e8400-e29b-41d4-a716';
      expect(() => new Uuid(invalidUuid)).toThrow(
        `<Uuid> does not allow the value <${invalidUuid}>`
      );
    });

    it('should throw when UUID has wrong length', () => {
      const tooLong = `${VALID_UUID}extra`;
      expect(() => new Uuid(tooLong)).toThrow(
        `<Uuid> does not allow the value <${tooLong}>`
      );
    });
  });

  describe('toString', () => {
    it('should return the UUID value as string', () => {
      const uuid = new Uuid(VALID_UUID);
      expect(uuid.toString()).toBe(VALID_UUID);
    });
  });

  describe('static random', () => {
    it('should generate a valid random UUID', () => {
      const uuid = Uuid.random();
      expect(uuid.value).toBeTruthy();
      expect(uuid.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate different UUIDs on each call', () => {
      const uuid1 = Uuid.random();
      const uuid2 = Uuid.random();

      expect(uuid1.value).not.toBe(uuid2.value);
    });
  });

  describe('equals', () => {
    it('should return true when comparing same UUID values', () => {
      const uuid1 = new Uuid(VALID_UUID);
      const uuid2 = new Uuid(VALID_UUID);

      expect(uuid1.equals(uuid2)).toBe(true);
    });

    it('should return false when comparing different UUID values', () => {
      const uuid1 = new Uuid(VALID_UUID);
      const uuid2 = new Uuid(ANOTHER_VALID_UUID);

      expect(uuid1.equals(uuid2)).toBe(false);
    });

    it('should be reflexive (equal to itself)', () => {
      const uuid = new Uuid(VALID_UUID);
      expect(uuid.equals(uuid)).toBe(true);
    });

    it('should be symmetric', () => {
      const uuid1 = new Uuid(VALID_UUID);
      const uuid2 = new Uuid(VALID_UUID);

      expect(uuid1.equals(uuid2)).toBe(uuid2.equals(uuid1));
    });

    it('should ignore whitespace differences since values are normalized', () => {
      const uuid1 = new Uuid(VALID_UUID);
      const uuid2 = new Uuid(`  ${VALID_UUID}  `);

      expect(uuid1.equals(uuid2)).toBe(true);
    });
  });
});
