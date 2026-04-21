import { Username } from "../../../../../src/Contexts/agroApi/Auth/domain/Username.js";
import { random } from "../../../shared/fixtures/index.js";

describe('UserName', () => {
  it('should create a valid username', () => {
    const username = new Username('validUser');
    expect(username).toBeInstanceOf(Username);
    expect(username.value).toBe('validUser');
  });

  it('should trim whitespace from the value', () => {
    const username = new Username('  validUser  ');
    expect(username.value).toBe('validUser');
  });

  it('should return the value from toString()', () => {
    const username = new Username('validUser');
    expect(username.toString()).toBe('validUser');
  });

  it('should be equal to another Username with the same value', () => {
    const a = new Username('sameUser');
    const b = new Username('sameUser');
    expect(a.equals(b)).toBe(true);
  });

  it('should not be equal to a Username with a different value', () => {
    const a = new Username('userOne');
    const b = new Username('userTwo');
    expect(a.equals(b)).toBe(false);
  });

  describe('validation', () => {
    it('should throw if username is longer than MAX_LENGTH', () => {
      const invalidUsername = random.word({ min: Username.MAX_LENGTH + 1 });
      expect(() => new Username(invalidUsername)).toThrow(
        `<Username> <${invalidUsername}> has more than ${Username.MAX_LENGTH} characters`
      );
    });

    it('should throw if username is shorter than MIN_LENGTH', () => {
      const invalidUsername = random.word({
        min: 1,
        max: Username.MIN_LENGTH - 1
      });
      expect(() => new Username(invalidUsername)).toThrow(
        `<Username> <${invalidUsername}> has less than ${Username.MIN_LENGTH} characters`
      );
    });
  });
});
