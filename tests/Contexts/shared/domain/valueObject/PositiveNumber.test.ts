import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { PositiveNumber } from '../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';

describe('PositiveNumber Value Object', () => {
  it('should successfully create a valid PositiveNumber', () => {
    const value = 42;
    const num = PositiveNumber.create(value);
    expect(num.value).toBe(value);
  });

  it('should throw InvalidArgumentException when value is not finite', () => {
    expect(() => PositiveNumber.create(Number.NaN)).toThrow(
      InvalidArgumentException
    );
    expect(() => PositiveNumber.create(Number.POSITIVE_INFINITY)).toThrow(
      InvalidArgumentException
    );
  });

  it('should throw InvalidArgumentException when value is less than or equal to 0', () => {
    expect(() => PositiveNumber.create(0)).toThrow(InvalidArgumentException);
    expect(() => PositiveNumber.create(-5)).toThrow(InvalidArgumentException);
  });
});
