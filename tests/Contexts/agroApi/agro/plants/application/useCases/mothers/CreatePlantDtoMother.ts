import type { CreatePlantDto } from '../../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/index.js';
import { random } from '../../../../../../shared/fixtures/index.js';

const base = (): CreatePlantDto => ({
  id: random.uuid(),
  name: 'Tomato',
  familyId: 'solanaceae',
  lifecycle: 'annual',
  size: {
    height: { min: 10, max: 100 },
    spread: { min: 10, max: 30 }
  },
  sowing: {
    seedsPerHole: { min: 1, max: 3 },
    germinationDays: { min: 7, max: 14 },
    months: [3, 4],
    methods: {
      direct: {
        depthCm: { min: 1, max: 2 }
      }
    }
  },
  floweringMonths: [6, 7],
  harvestMonths: [8, 9],
  spacingCm: { min: 10, max: 20 }
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
      name: 'Lettuce',
      familyId: 'asteraceae',
      size: {
        height: { min: 5, max: 20 },
        spread: { min: 5, max: 15 }
      },
      sowing: {
        ...dto.sowing,
        months: [2]
      },
      floweringMonths: [4],
      harvestMonths: [5],
      spacingCm: { min: 5, max: 10 }
    };
  }

  static withOptionalFields(): CreatePlantDto {
    const dto = base();

    return {
      ...dto,
      scientificName: 'Solanum lycopersicum'
    };
  }

  static custom(overrides: Partial<CreatePlantDto>): CreatePlantDto {
    const dto = base();

    return {
      ...dto,
      ...overrides
    };
  }
}
