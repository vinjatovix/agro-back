import { PasswordHash } from '../../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';

describe('PasswordHash', () => {
  // Valid bcrypt hashes for testing - all with exactly 53 chars in the body
  const VALID_HASH_1 = `$2b$10$${'a'.repeat(53)}`;
  const VALID_HASH_2 = `$2b$10$${'b'.repeat(53)}`;
  const VALID_HASH_3 = '$2a$12$mZgfH4D7z4dZcZHDKyogqOOnEWS6XHLdczPJktzD88djpvlr3Bq1C';

  describe('constructor', () => {
    it('should create a valid password hash', () => {
      const hash = new PasswordHash(VALID_HASH_1);
      expect(hash.value).toBe(VALID_HASH_1);
    });

    it('should create valid password hash with different salt', () => {
      const hash = new PasswordHash(VALID_HASH_2);
      expect(hash.value).toBe(VALID_HASH_2);
    });

    it('should accept different cost factors', () => {
      const hash = new PasswordHash(VALID_HASH_3);
      expect(hash.value).toBe(VALID_HASH_3);
    });

    it('should throw when value is empty string', () => {
      expect(() => new PasswordHash('')).toThrow(
        '<PasswordHash> does not allow the value <>'
      );
    });

    it('should throw when value is not a bcrypt hash', () => {
      expect(() => new PasswordHash('not-a-bcrypt-hash')).toThrow(
        '<PasswordHash> does not allow the value <not-a-bcrypt-hash>'
      );
    });

    it('should throw when value has incorrect hash format (wrong prefix)', () => {
      const invalidPrefix = '$1a$10$vI8aWBYW2BTqis90nFmNfe9T9sxiJee0B6Lolq8oC20PZLQArI8nK';
      expect(() => new PasswordHash(invalidPrefix)).toThrow(
        `<PasswordHash> does not allow the value <${invalidPrefix}>`
      );
    });

    it('should throw when value has incorrect cost format', () => {
      const invalidCost = '$2a$5$vI8aWBYW2BTqis90nFmNfe9T9sxiJee0B6Lolq8oC20PZLQArI8nK';
      expect(() => new PasswordHash(invalidCost)).toThrow(
        `<PasswordHash> does not allow the value <${invalidCost}>`
      );
    });

    it('should throw when value has incorrect hash body', () => {
      const invalidBody = '$2a$10$invalid_hash_body_that_is_too_short';
      expect(() => new PasswordHash(invalidBody)).toThrow(
        `<PasswordHash> does not allow the value <${invalidBody}>`
      );
    });
  });

  describe('toString', () => {
    it('should return the hash value as string', () => {
      const hash = new PasswordHash(VALID_HASH_1);
      expect(hash.toString()).toBe(VALID_HASH_1);
    });

    it('should return different values for different hashes', () => {
      const hash1 = new PasswordHash(VALID_HASH_1);
      const hash2 = new PasswordHash(VALID_HASH_2);

      expect(hash1.toString()).not.toBe(hash2.toString());
    });
  });

  describe('equals', () => {
    it('should return true when comparing same hash values', () => {
      const hash1 = new PasswordHash(VALID_HASH_1);
      const hash2 = new PasswordHash(VALID_HASH_1);

      expect(hash1.equals(hash2)).toBe(true);
    });

    it('should return false when comparing different hash values', () => {
      const hash1 = new PasswordHash(VALID_HASH_1);
      const hash2 = new PasswordHash(VALID_HASH_2);

      expect(hash1.equals(hash2)).toBe(false);
    });

    it('should be symmetric', () => {
      const hash1 = new PasswordHash(VALID_HASH_1);
      const hash2 = new PasswordHash(VALID_HASH_2);

      expect(hash1.equals(hash2)).toBe(hash2.equals(hash1));
    });

    it('should be reflexive (equal to itself)', () => {
      const hash = new PasswordHash(VALID_HASH_1);
      expect(hash.equals(hash)).toBe(true);
    });
  });
});
