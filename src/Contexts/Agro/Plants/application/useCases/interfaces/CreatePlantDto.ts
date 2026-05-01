import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';
import type { PlantKnowledgePrimitives } from '../../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PollinationType } from '../../../domain/entities/types/PollinationType.js';

export interface CreatePlantDto {
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
    sowing: {
      months: number[];
      seedsPerHole: RangePrimitives;
      germinationDays: RangePrimitives;
      methods: {
        direct: { depthCm: RangePrimitives };
        starter?: { depthCm: RangePrimitives };
      };
    };
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
}
