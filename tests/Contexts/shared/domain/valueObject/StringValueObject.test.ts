import { StringValueObject } from '../../../../../src/Contexts/shared/domain/valueObject/StringValueObject.js';

describe('StringValueObject', () => {
  describe('constructor and toString', () => {
    it('should create a valid string value object', () => {
      const vo = new StringValueObject('hello');
      expect(vo.value).toBe('hello');
    });

    it('should trim whitespace from input', () => {
      const vo = new StringValueObject('  hello  ');
      expect(vo.value).toBe('hello');
    });

    it('should convert to string with toString()', () => {
      const vo = new StringValueObject('test');
      expect(vo.toString()).toBe('test');
    });

    it('should throw when value is not a string', () => {
      expect(() => new StringValueObject(123 as any)).toThrow(
        '<StringValueObject> does not allow the value <123>'
      );
    });

    it('should throw when value is null', () => {
      expect(() => new StringValueObject(null as any)).toThrow(
        '<StringValueObject> does not allow the value <null>'
      );
    });

    it('should throw when value is undefined', () => {
      expect(() => new StringValueObject(undefined as any)).toThrow(
        '<StringValueObject> does not allow the value <undefined>'
      );
    });
  });

  describe('equals', () => {
    it('should return true when comparing identical values', () => {
      const vo1 = new StringValueObject('test');
      const vo2 = new StringValueObject('test');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false when comparing different values', () => {
      const vo1 = new StringValueObject('test1');
      const vo2 = new StringValueObject('test2');

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should be reflexive (equal to itself)', () => {
      const vo = new StringValueObject('test');
      expect(vo.equals(vo)).toBe(true);
    });

    it('should be symmetric', () => {
      const vo1 = new StringValueObject('test');
      const vo2 = new StringValueObject('test');

      expect(vo1.equals(vo2)).toBe(vo2.equals(vo1));
    });

    it('should be case-sensitive in comparison', () => {
      const vo1 = new StringValueObject('Test');
      const vo2 = new StringValueObject('test');

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should compare trimmed values (whitespace stripped on constructor)', () => {
      const vo1 = new StringValueObject('  test  ');
      const vo2 = new StringValueObject('test');

      expect(vo1.equals(vo2)).toBe(true);
    });
  });
});
