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
import { Plant } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';

type NullablePatch<T> = {
  [K in keyof T]?: T[K] | null;
};

type PlantMotherOverrides = NullablePatch<PlantProps>;

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
  static create(overrides: PlantMotherOverrides = {}): Plant {
    const props: PlantProps = {
      ...base,
      id: UuidMother.random(),

      name: overrides.name ?? base.name,
      familyId: overrides.familyId ?? base.familyId,
      lifecycle: overrides.lifecycle ?? base.lifecycle,

      size: {
        height: overrides.size?.height ?? base.size.height,
        spread: overrides.size?.spread ?? base.size.spread
      },

      spacingCm: overrides.spacingCm ?? base.spacingCm,
      sowing: overrides.sowing ?? base.sowing,
      floweringMonths: overrides.floweringMonths ?? base.floweringMonths,
      harvestMonths: overrides.harvestMonths ?? base.harvestMonths,
      metadata: overrides.metadata ?? base.metadata
    };

    if (overrides.scientificName !== undefined) {
      props.scientificName = overrides.scientificName as string; // allow null to clear the scientificName field
    }

    return new Plant(props);
  }

  static tomato(overrides: Partial<PlantMotherOverrides> = {}): Plant {
    return this.create({
      id: UuidMother.random(),

      name: 'Tomato',
      familyId: 'solanaceae',
      ...overrides
    });
  }

  static lettuce(overrides: Partial<PlantMotherOverrides> = {}): Plant {
    return this.create({
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
}
