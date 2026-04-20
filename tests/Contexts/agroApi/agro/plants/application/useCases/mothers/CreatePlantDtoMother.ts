import type { CreatePlantDto } from '../../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/CreatePlantDto.js';

const baseDto: CreatePlantDto = {
  id: 'tomato',
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
};

export class CreatePlantDtoMother {
  static tomato(): CreatePlantDto {
    return baseDto;
  }

  static lettuce(): CreatePlantDto {
    return {
      ...baseDto,
      id: 'lettuce',
      name: 'Lettuce',
      familyId: 'asteraceae',
      lifecycle: 'annual',
      size: {
        height: { min: 5, max: 20 },
        spread: { min: 5, max: 15 }
      },
      sowing: {
        ...baseDto.sowing,
        months: [2]
      },
      floweringMonths: [4],
      harvestMonths: [5],
      spacingCm: { min: 5, max: 10 }
    };
  }

  static withOptionalFields(): CreatePlantDto {
    return {
      ...baseDto,
      scientificName: 'Solanum lycopersicum'
    };
  }

  static custom(overrides: Partial<CreatePlantDto>): CreatePlantDto {
    return {
      ...baseDto,
      ...overrides
    };
  }
}
