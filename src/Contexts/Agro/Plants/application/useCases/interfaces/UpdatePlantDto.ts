import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PlantKnowledgeChanges } from '../../../domain/entities/types/PlantKnowledgeChanges.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';

// Ranges are partial: PATCH may send a single bound, merged by the domain.
export interface UpdatePlantDto {
  identity?: {
    name?: {
      primary?: string;
      aliases?: string[];
    };
    scientificName?: string;
    family?: string;
  };

  traits?: {
    lifecycle?: PlantLifecycleValue;
    size?: {
      height?: PartialRange;
      spread?: PartialRange;
    };

    spacingCm?: PartialRange;
  };

  phenology?: {
    sowing?: {
      months?: number[];
      seedsPerHole?: PartialRange;
      germinationDays?: PartialRange;
      methods?: {
        direct?: { depthCm?: PartialRange };
        starter?: { depthCm?: PartialRange };
      };
    };
    flowering?: {
      months?: number[];
      pollination?: {
        type: string;
        agents?: string[];
      };
    };
    harvest?: {
      months?: number[];
      description?: string;
    };
  };

  knowledge?: PlantKnowledgeChanges;
}
