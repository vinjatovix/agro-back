import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PlantLightPrimitives } from './PlantLightPrimitives.js';
import type { PruningTypePrimitives } from './PruningPrimitves.js';
import type { RootSystemType } from './RootSystemType.js';
import type { Seasons } from './Seasons.js';
import type { WateringFrequency } from './WateringFrequency.js';

export type PlantKnowledgeChanges = {
  soil?: {
    ph?: PartialRange;
    availableDepthCm?: PartialRange;
  };
  rootSystem?: {
    type?: RootSystemType;
    depthCm?: PartialRange;
    spreadCm?: PartialRange;
  };
  watering?: {
    frequency?: WateringFrequency;
    conditions?: string[];
  };
  light?: Partial<PlantLightPrimitives>;
  pruning?: PruningTypePrimitives[];
  propagation?: {
    methods?: Record<
      string,
      {
        season?: Seasons;
        estimatedTimeWeeks?: PartialRange;
        bestPractices?: string[];
      }
    >;
  };
  ecology?: {
    strategicBenefits?: string[];
  };
  resources?: Array<{
    type: 'image' | 'article' | 'video' | (string & {});
    url: string;
    title?: string;
    source?: string;
    tags?: string[];
  }>;
  notes?: string[];
};
