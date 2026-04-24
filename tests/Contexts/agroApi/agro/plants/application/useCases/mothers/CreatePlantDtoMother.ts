import type { CreatePlantDto } from '../../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/index.js';
import type { PlantLifecycleValue } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantLifecycleValue.js';
import { random } from '../../../../../../shared/fixtures/index.js';

const lifecycle = (): PlantLifecycleValue =>
  random.arrayElement(['annual', 'biennial', 'perennial']);

const range = (minA: number, maxA: number) => ({
  min: minA,
  max: maxA
});

const base = (): CreatePlantDto => ({
  id: random.uuid(),

  identity: {
    name: {
      primary: 'Tomato'
    },
    familyId: 'solanaceae'
  },

  traits: {
    lifecycle: lifecycle(),

    size: {
      height: range(10, 100),
      spread: range(10, 30)
    },

    spacingCm: range(10, 20)
  },

  phenology: {
    sowing: {
      months: [3, 4],

      seedsPerHole: range(1, 3),

      germinationDays: range(7, 14),

      methods: {
        direct: {
          depthCm: range(1, 2)
        }
      }
    },

    flowering: {
      months: [6, 7]
    },

    harvest: {
      months: [8, 9]
    }
  }
});

export class CreatePlantDtoMother {
  static tomato(): CreatePlantDto {
    return base();
  }

  static lettuce(): CreatePlantDto {
    const dto = base();

    return {
      ...dto,

      id: random.uuid(),

      identity: {
        name: { primary: 'Lettuce' },
        familyId: 'asteraceae'
      },

      traits: {
        lifecycle: 'annual',
        size: {
          height: range(5, 20),
          spread: range(5, 15)
        },
        spacingCm: range(5, 10)
      },

      phenology: {
        ...dto.phenology,

        sowing: {
          ...dto.phenology.sowing,
          months: [2]
        },

        flowering: {
          months: [4]
        },

        harvest: {
          months: [5]
        }
      }
    };
  }

  static withOptionalFields(): CreatePlantDto {
    const dto = base();

    return {
      ...dto,

      identity: {
        ...dto.identity,
        scientificName: 'Solanum lycopersicum'
      }
    };
  }

  static custom(overrides: Partial<CreatePlantDto>): CreatePlantDto {
    return {
      ...base(),
      ...overrides
    };
  }
}
