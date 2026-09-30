import { PlainPassword } from '../../../../src/Contexts/Auth/domain/value-objects/PlainPassword.js';
import { InvalidArgumentException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { PlainPasswordMother } from './mothers/PlainPasswordMother.js';

describe('PlainPassword', () => {
  it('should create a valid password', () => {
    const password = PlainPasswordMother.valid();
    expect(password).toBeInstanceOf(PlainPassword);
  });

  it('should expose the password value', () => {
    const password = PlainPasswordMother.valid();
    expect(typeof password.value).toBe('string');
  });

  it('should return the value from toString()', () => {
    const password = PlainPasswordMother.valid();
    expect(password.toString()).toBe(password.value);
  });

  it('should be equal to another PlainPassword with the same value', () => {
    const a = PlainPasswordMother.valid();
    const b = PlainPasswordMother.valid();
    expect(a.equals(b)).toBe(true);
  });

  it('should not be equal to a PlainPassword with a different value', () => {
    const a = PlainPasswordMother.valid();
    const b = PlainPasswordMother.create('Different1!');
    expect(a.equals(b)).toBe(false);
  });

  describe('validation', () => {
    it('should throw if value is not a string', () => {
      expect(() => new PlainPassword(12345 as unknown as string)).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if shorter than MIN_LENGTH', () => {
      const short = PlainPasswordMother.withLength(
        PlainPassword.MIN_LENGTH - 1
      );
      expect(() => PlainPasswordMother.create(short)).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if longer than MAX_LENGTH', () => {
      const long = PlainPasswordMother.withLength(PlainPassword.MAX_LENGTH + 1);
      expect(() => PlainPasswordMother.create(long)).toThrow(
        InvalidArgumentException
      );
    });

    it('should accept exactly MAX_LENGTH characters', () => {
      const longest = PlainPasswordMother.withLength(PlainPassword.MAX_LENGTH);
      expect(PlainPasswordMother.create(longest)).toBeInstanceOf(PlainPassword);
    });

    it('should count an emoji as one character', () => {
      // MIN_LENGTH - 1 code points, but more UTF-16 units than MIN_LENGTH.
      const withEmoji = PlainPasswordMother.withLength(
        PlainPassword.MIN_LENGTH - 1,
        '😀'
      );
      expect(withEmoji.length).toBeGreaterThanOrEqual(PlainPassword.MIN_LENGTH);
      expect(() => PlainPasswordMother.create(withEmoji)).toThrow(
        InvalidArgumentException
      );
    });

    it('should accept exactly MAX_BYTES bytes of UTF-8', () => {
      const fullBytes = PlainPasswordMother.withBytes(PlainPassword.MAX_BYTES);
      expect(PlainPasswordMother.create(fullBytes)).toBeInstanceOf(
        PlainPassword
      );
    });

    it('should throw if longer than MAX_BYTES bytes of UTF-8 within MAX_LENGTH characters', () => {
      const tooManyBytes = PlainPasswordMother.withBytes(
        PlainPassword.MAX_BYTES + 2
      );
      expect(Array.from(tooManyBytes).length).toBeLessThanOrEqual(
        PlainPassword.MAX_LENGTH
      );
      expect(() => PlainPasswordMother.create(tooManyBytes)).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if missing uppercase letter', () => {
      expect(() => PlainPasswordMother.create('validpass1!')).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if missing lowercase letter', () => {
      expect(() => PlainPasswordMother.create('VALIDPASS1!')).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if missing digit', () => {
      expect(() => PlainPasswordMother.create('ValidPass!!')).toThrow(
        InvalidArgumentException
      );
    });

    it('should throw if missing special character', () => {
      expect(() => PlainPasswordMother.create('ValidPass12')).toThrow(
        InvalidArgumentException
      );
    });
  });
});
