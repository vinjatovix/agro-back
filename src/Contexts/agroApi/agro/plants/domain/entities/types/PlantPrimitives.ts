import type { RangePrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { MetadataPrimitives } from '../../../../../../shared/infrastructure/persistence/mongo/types/index.js';
import type { PlantLifecycleValue } from './PlantLifecycleValue.js';
import type { PlantStatus } from './PlantStatus.js';

export interface PlantPrimitives {
  id: string;
  name: string;
  scientificName?: string;
  familyId: string;
  lifecycle: PlantLifecycleValue;
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
  floweringMonths: number[];
  harvestMonths: number[];
  spacingCm: RangePrimitives;
  metadata: MetadataPrimitives;
  status: PlantStatus;
  deletedAt?: string | null;
}
