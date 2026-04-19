import type { CreatePlantDto } from '../../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/CreatePlantDto.js';

export class CreatePlantDtoMother {
  static tomato(): CreatePlantDto {
    return {
      id: 'tomato',
      name: 'Tomato',
      familyId: 'solanaceae',
      lifecycle: 'annual',
      size: {
        height: { min: 10, max: 100 },
        spread: { min: 10, max: 30 }
      },
      sowingMonths: [3, 4],
      floweringMonths: [6, 7],
      harvestMonths: [8, 9],
      spacingCm: { min: 10, max: 20 }
    };
  }

  static lettuce(): CreatePlantDto {
    return {
      id: 'lettuce',
      name: 'Lettuce',
      familyId: 'asteraceae',
      lifecycle: 'annual',
      size: {
        height: { min: 5, max: 20 },
        spread: { min: 5, max: 15 }
      },
      sowingMonths: [2],
      floweringMonths: [4],
      harvestMonths: [5],
      spacingCm: { min: 5, max: 10 }
    };
  }

  static withOptionalFields(): CreatePlantDto {
    return {
      ...this.tomato(),
      scientificName: 'Solanum lycopersicum'
    };
  }

  static custom(overrides: Partial<CreatePlantDto>): CreatePlantDto {
    return {
      ...this.tomato(),
      ...overrides
    };
  }
}
