import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PlantKnowledgeChanges } from '../../../domain/entities/types/PlantKnowledgeChanges.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';
import type { PollinationType } from '../../../domain/entities/types/PollinationType.js';

// Ranges are partial: PATCH may send a single bound, merged by the domain.
// `null` removes an optional field; an absent one is kept.
export interface UpdatePlantDto {
  identity?: {
    name?: {
      primary?: string;
      aliases?: string[] | null;
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
        starter?: { depthCm?: PartialRange } | null;
      };
    };
    flowering?: {
      months?: number[];
      pollination?: {
        types?: PollinationType[];
        agents?: string[] | null;
      } | null;
    };
    harvest?: {
      months?: number[];
      description?: string | null;
    };
  };

  knowledge?: PlantKnowledgeChanges;
}
