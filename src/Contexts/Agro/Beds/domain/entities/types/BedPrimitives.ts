import type { MetadataPrimitives } from '../../../../../shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js';
import type { PlantInstancePrimitives } from '../../../../PlantInstances/domain/entities/types/PlantInstancePrimitives.js';

export type BedPrimitives = {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  plantInstances: PlantInstancePrimitives[];
  metadata: MetadataPrimitives;
  deleted: boolean;
  deletedAt?: Date;
};
