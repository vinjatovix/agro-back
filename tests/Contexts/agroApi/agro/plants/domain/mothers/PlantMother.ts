import { Plant } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import {
  MonthSet,
  Range
} from '../../../../../../../src/shared/domain/value-objects/index.js';
import {
  PlantLifecycle,
  PlantSowing
} from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/index.js';
import { Metadata } from '../../../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { UuidMother } from '../../../../../shared/fixtures/UuidMother.js';
import type { PlantProps } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantProps.js';

const base: PlantProps = {
  id: UuidMother.random(),
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

  metadata: Metadata.create('test')
};

export class PlantMother {
  static tomato(
    overrides: Partial<ConstructorParameters<typeof Plant>[0]> = {}
  ): Plant {
    return new Plant({
      ...base,
      id: UuidMother.random(),
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
      id: UuidMother.random(),
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
