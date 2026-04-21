import type { CoordinatesPrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/index.js';
import type { CropGrowthStatus } from './CropGrowthStatus.js';
import type { PlantInstanceLifecycleStatus } from './PlantLifeCicleStatus.js';

export interface PlantInstancePrimitives {
  id: string;
  userId: string;
  plantId: string;
  position: CoordinatesPrimitives;
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: string;
  removedAt?: string;
  variety?: string;
  notes?: string;
}
