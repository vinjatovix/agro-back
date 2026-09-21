import type { Coordinates } from '../../../../../../shared/domain/value-objects/index.js';
import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { PlantId } from '../../../../Plants/domain/PlantId.js';
import type { PlantInstanceId } from '../../PlantInstanceId.js';
import type { CropGrowthStatus } from './CropGrowthStatus.js';
import type { PlantInstanceLifecycleStatus } from './PlantLifecycleStatus.js';

export type PlantInstanceProps = {
  id: PlantInstanceId;
  userId: UserId;
  plantId: PlantId;
  position: Coordinates;
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: Date;
  removedAt?: Date;
  variety?: string;
  notes?: string;
};
