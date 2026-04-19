import { Plant } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { Range } from '../../../../../../../src/shared/domain/value-objects/Range.js';
import { MonthSet } from '../../../../../../../src/shared/domain/value-objects/MonthSet.js';

export class PlantMother {
  static tomato(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      id: 'tomato',
      name: 'Tomato',
      lifecycle: 'annual',

      size: {
        height: new Range(10, 100),
        spread: new Range(10, 30)
      },

      spacingCm: new Range(10, 20),

      sowingMonths: new MonthSet([3, 4]),
      floweringMonths: new MonthSet([6, 7]),
      harvestMonths: new MonthSet([8, 9]),

      ...overrides
    });
  }

  static lettuce(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      id: 'lettuce',
      name: 'Lettuce',
      lifecycle: 'annual',

      size: {
        height: new Range(5, 30),
        spread: new Range(5, 20)
      },

      spacingCm: new Range(5, 15),

      sowingMonths: new MonthSet([2, 3]),
      floweringMonths: new MonthSet([4, 5]),
      harvestMonths: new MonthSet([6, 7]),

      ...overrides
    });
  }

  static create(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]>
  ): Plant {
    return new Plant({
      id: 'plant_' + Math.random().toString(36).substring(2),
      name: 'Generic plant',
      lifecycle: 'annual',

      size: {
        height: new Range(10, 50),
        spread: new Range(10, 50)
      },

      spacingCm: new Range(10, 20),

      sowingMonths: new MonthSet([3]),
      floweringMonths: new MonthSet([6]),
      harvestMonths: new MonthSet([9]),

      ...overrides
    });
  }
}
