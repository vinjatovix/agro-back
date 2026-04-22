import type { RangePrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';

export interface UpdatePlantDto {
  id: string;
  name?: string;
  familyId?: string;
  lifecycle?: PlantLifecycleValue;
  spacingCm?: RangePrimitives;
  floweringMonths?: number[];
  harvestMonths?: number[];
  scientificName?: string | null;
  size?: {
    height?: RangePrimitives;
    spread?: RangePrimitives;
  };
  sowing?: {
    months?: number[];
    seedsPerHole?: RangePrimitives;
    germinationDays?: RangePrimitives;
    methods?: {
      direct?: { depthCm: RangePrimitives };
      starter?: { depthCm: RangePrimitives };
    };
  };
}
