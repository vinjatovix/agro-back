import type { Coordinates } from '../../../../../../shared/domain/value-objects/index.js';
import type { Uuid } from '../../../../../shared/domain/valueObject/index.js';
import type { CropGrowthStatus } from './CropGrowthStatus.js';
import type { PlantInstanceLifecycleStatus } from './PlantLifeCicleStatus.js';

export type PlantInstanceProps = {
  id: Uuid;
  userId: Uuid;
  plantId: Uuid;
  position: Coordinates;
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: Date;
  removedAt?: Date;
  variety?: string;
  notes?: string;
};
