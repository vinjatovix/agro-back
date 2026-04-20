import {
  Plant,
  type PlantProps
} from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { Range } from '../../../../../../../src/shared/domain/value-objects/Range.js';
import { MonthSet } from '../../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { PlantLifecycle } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantLifecycicle.js';
import { random } from '../../../../Auth/fixtures/shared/index.js';
import { PlantSowing } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantSowing.js';
import { Metadata } from '../../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

const base: PlantProps = {
  id: random.uuid(),
  name: 'Generic plant',
  familyId: 'generic',
  lifecycle: PlantLifecycle.from('annual'),

  size: {
    height: new Range(10, 50),
    spread: new Range(10, 50)
  },

  spacingCm: new Range(10, 20),

  sowing: new PlantSowing({
    seedsPerHole: new Range(1, 3),
    germinationDays: new Range(7, 14),
    months: new MonthSet([3]),
    methods: {
      direct: { depth: new Range(1, 2) }
    }
  }),
  floweringMonths: new MonthSet([6]),
  harvestMonths: new MonthSet([9]),

  metadata: new Metadata({
    createdAt: new Date(),
    createdBy: 'test',
    updatedAt: new Date(),
    updatedBy: 'test'
  })
};

export class PlantMother {
  static tomato(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      ...base,
      id: 'tomato',
      name: 'Tomato',
      familyId: 'solanaceae',

      ...overrides
    });
  }

  static lettuce(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      ...base,
      id: 'lettuce',
      name: 'Lettuce',
      familyId: 'asteraceae',

      size: {
        height: new Range(5, 30),
        spread: new Range(5, 20)
      },

      spacingCm: new Range(5, 15),

      floweringMonths: new MonthSet([4, 5]),
      harvestMonths: new MonthSet([6, 7]),

      ...overrides
    });
  }

  static create(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      ...base,
      ...overrides
    });
  }
}
