import type { CoordinatesPrimitives } from '../../../../../../shared/domain/value-objects/interfaces/index.js';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { CropGrowthStatus } from './CropGrowthStatus.js';
import type { PlantInstanceLifecycleStatus } from './PlantLifecycleStatus.js';

export type PlantInstancePrimitives = {
  id: string;
  userId: string;
  bedId: string;
  plantId: string;
  position?: CoordinatesPrimitives | undefined;
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: string;
  removedAt?: string | undefined;
  variety?: string | undefined;
  notes?: string | undefined;
  metadata: MetadataPrimitives;
  version: number;
};
