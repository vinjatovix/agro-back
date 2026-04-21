import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantLifecycleValue } from './types/PlantLifecycleValue.js';

export interface PlantPatch {
  id: string;
  name?: string;
  scientificName?: string;
  familyId?: string;
  lifecycle?: PlantLifecycleValue;
  spacingCm?: RangePrimitives;
  floweringMonths?: number[];
  harvestMonths?: number[];
  size?: {
    height?: RangePrimitives;
    spread?: RangePrimitives;
  };
  sowing?: {
    months?: number[];
    seedsPerHole?: RangePrimitives;
    germinationDays?: RangePrimitives;
    methods?: {
      direct?: { depthCm?: RangePrimitives };
      starter?: { depthCm?: RangePrimitives };
    };
  };
}
