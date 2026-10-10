import type { Coordinates } from '../../../../../../shared/domain/value-objects/index.js';
import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { BedId } from '../../../../Beds/domain/BedId.js';
import type { PlantId } from '../../../../Plants/domain/PlantId.js';
import type { PlantInstanceId } from '../../PlantInstanceId.js';
import type { CropGrowthStatus } from './CropGrowthStatus.js';
import type { PlantInstanceLifecycleStatus } from './PlantLifecycleStatus.js';

export type PlantInstanceProps = {
  id: PlantInstanceId;
  userId: UserId;
  bedId: BedId;
  plantId: PlantId;
  position?: Coordinates | undefined;
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: Date;
  removedAt?: Date | undefined;
  variety?: string | undefined;
  notes?: string | undefined;
  metadata: Metadata;
  version?: number | undefined;
};
