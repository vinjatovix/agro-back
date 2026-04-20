import type { PlantLifecycleValue } from '../../value-objects/PlantLifecycicle.js';

export interface PlantPrimitives {
  id: string;
  name: string;
  scientificName?: string;
  familyId: string;
  lifecycle: PlantLifecycleValue;

  size: {
    height: { min: number; max: number };
    spread: { min: number; max: number };
  };

  sowing: {
    months: number[];
    seedsPerHole?: { min: number; max: number };
    germinationDays?: { min: number; max: number };
    methods?: {
      direct?: { depthCm: { min: number; max: number } };
      starter?: { depthCm: { min: number; max: number } };
    };
  };

  floweringMonths: number[];
  harvestMonths: number[];

  spacingCm: { min: number; max: number };

  metadata?: {
    createdAt?: Date;
    createdBy?: string;
    updatedAt: Date;
    updatedBy: string;
  };
}
