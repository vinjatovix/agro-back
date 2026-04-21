import type { RangePrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';

export interface CreatePlantDto {
  id: string;
  name: string;
  scientificName?: string;
  familyId: string;
  lifecycle: PlantLifecycleValue;
  spacingCm: RangePrimitives;
  harvestMonths: number[];
  floweringMonths: number[];
  size: {
    height: RangePrimitives;
    spread: RangePrimitives;
  };
  sowing: {
    months: number[];
    seedsPerHole: RangePrimitives;
    germinationDays: RangePrimitives;
    methods: {
      direct: { depthCm: RangePrimitives };
      starter?: { depthCm: RangePrimitives };
    };
  };
}
