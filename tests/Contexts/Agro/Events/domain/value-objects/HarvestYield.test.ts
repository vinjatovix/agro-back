import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { HarvestYield } from '../../../../../../src/Contexts/Agro/Events/domain/value-objects/HarvestYield.js';

describe('HarvestYield Value Object', () => {
  it('should create a valid HarvestYield instance', () => {
    const yieldValue = 150.5;
    const harvestYield = HarvestYield.create(yieldValue);
    expect(harvestYield.value).toBe(yieldValue);
  });

  it('should throw InvalidArgumentException if value is not a finite number', () => {
    expect(() => HarvestYield.create(Number.NaN)).toThrow(
      InvalidArgumentException
    );
    expect(() => HarvestYield.create(Number.POSITIVE_INFINITY)).toThrow(
      InvalidArgumentException
    );
  });

  it('should throw InvalidArgumentException if value is less than or equal to 0', () => {
    expect(() => HarvestYield.create(0)).toThrow(InvalidArgumentException);
    expect(() => HarvestYield.create(-10)).toThrow(InvalidArgumentException);
  });
});
