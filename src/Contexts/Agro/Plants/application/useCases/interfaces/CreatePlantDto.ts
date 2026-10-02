import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantKnowledgePrimitives } from '../../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';
import type { PollinationType } from '../../../domain/entities/types/PollinationType.js';

// Create requires the sections every plant has; the rest stay optional.
type CreatePlantKnowledgeDto = PlantKnowledgePrimitives &
  Required<
    Pick<
      PlantKnowledgePrimitives,
      'rootSystem' | 'soil' | 'light' | 'propagation'
    >
  >;

export interface CreatePlantDto {
  id: string;

  identity: {
    name: {
      primary: string;
      aliases?: string[];
    };
    scientificName: string;
    family: string;
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
    // Absent for plants that never flower or are not harvested.
    flowering?: {
      months: number[];
      pollination?: {
        types: PollinationType[];
        agents?: string[];
      };
    };
    harvest?: {
      months: number[];
      description?: string;
    };
  };

  knowledge: CreatePlantKnowledgeDto;
}
