import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { WateringAmount } from '../../../../../../src/Contexts/Agro/Events/domain/value-objects/WateringAmount.js';

describe('WateringAmount Value Object', () => {
  it('should create a valid WateringAmount instance', () => {
    const amount = 2.5;
    const wateringAmount = WateringAmount.create(amount);
    expect(wateringAmount.value).toBe(amount);
  });

  it('should throw InvalidArgumentException if value is not a finite number', () => {
    expect(() => WateringAmount.create(Number.NaN)).toThrow(
      InvalidArgumentException
    );
    expect(() => WateringAmount.create(Number.POSITIVE_INFINITY)).toThrow(
      InvalidArgumentException
    );
  });

  it('should throw InvalidArgumentException if value is less than or equal to 0', () => {
    expect(() => WateringAmount.create(0)).toThrow(InvalidArgumentException);
    expect(() => WateringAmount.create(-1.2)).toThrow(InvalidArgumentException);
  });
});
