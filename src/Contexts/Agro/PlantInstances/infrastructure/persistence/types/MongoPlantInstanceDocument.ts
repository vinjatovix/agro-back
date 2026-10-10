import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type {
  CropGrowthStatus,
  PlantInstanceLifecycleStatus
} from '../../../domain/entities/types/index.js';

export type MongoPlantInstanceDocument = {
  _id: Binary | UUID | string;
  userId: Binary | UUID | string;
  bedId: Binary | UUID | string;
  plantId: Binary | UUID | string;
  position?: {
    x: number;
    y: number;
  };
  growthStatus: CropGrowthStatus;
  instanceStatus: PlantInstanceLifecycleStatus;
  plantedAt: string;
  removedAt?: string;
  variety?: string;
  notes?: string;
  metadata: MetadataPrimitives;
  version: number;
};
