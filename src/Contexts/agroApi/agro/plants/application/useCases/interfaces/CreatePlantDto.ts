import type { PlantLifecycleValue } from '../../../domain/value-objects/PlantLifecycicle.js';

export interface CreatePlantDto {
  id: string;
  name: string;

  scientificName?: string;
  familyId: string;

  lifecycle: PlantLifecycleValue;

  size: {
    height: { min: number; max: number };
    spread: { min: number; max: number };
  };

  sowingMonths: number[];
  floweringMonths: number[];
  harvestMonths: number[];

  spacingCm: { min: number; max: number };
}
