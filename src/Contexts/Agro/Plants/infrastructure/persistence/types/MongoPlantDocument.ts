import type { Binary, UUID } from 'mongodb';
import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantKnowledgePrimitives } from '../../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';
import type { PlantPrimitives } from '../../../domain/entities/types/PlantPrimitives.js';
import type { PlantSowingPrimitives } from '../../../domain/entities/types/PlantSowingPrimitives.js';

export type MongoPlantDocument = {
  _id: string | Binary | UUID;
  identity: {
    name: {
      primary: string;
      aliases?: string[];
    };
    familyId: string;
    scientificName?: string;
  };

  traits: {
    lifecycle: PlantLifecycleValue;
    size: {
      height: RangePrimitives;
      spread: RangePrimitives;
    };
    spacingCm: RangePrimitives;
  };

  phenology: {
    sowing: PlantSowingPrimitives;
    flowering: {
      months: number[];
      pollination?: {
        type: string;
        agents?: string[];
      };
    };
    harvest: {
      months: number[];
      description?: string;
    };
  };

  knowledge?: PlantKnowledgePrimitives;

  metadata: PlantPrimitives['metadata'];
  status: PlantPrimitives['status'];
  deletedAt?: string | null;
};
