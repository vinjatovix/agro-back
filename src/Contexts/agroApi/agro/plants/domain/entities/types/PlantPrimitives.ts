import type { RangePrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { MetadataPrimitives } from '../../../../../../shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js';
import type { PlantKnowledgePrimitives } from './PlantKnowledgePrimitives.js';
import type { PlantLifecycleValue } from './PlantLifecycleValue.js';
import type { PlantSowingPrimitives } from './PlantSowingPrimitives.js';
import type { PlantStatus } from './PlantStatus.js';
import type { PollinationType } from './PollinationType.js';

export interface PlantPrimitives {
  id: string;

  identity: {
    name: {
      primary: string;
      aliases?: string[];
    };
    scientificName?: string;
    familyId: string;
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
        type: PollinationType;
        agents?: string[];
      };
    };
    harvest: {
      months: number[];
      description?: string;
    };
  };

  knowledge?: PlantKnowledgePrimitives;

  metadata: MetadataPrimitives;
  status: PlantStatus;
  deletedAt?: string | null;
}
