import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantLightPrimitives } from './PlantLightPrimitives.js';
import type { PlantPropagationPrimitives } from './PlantPropagationPrimitives.js';
import type { PruningTypePrimitives } from './PruningPrimitves.js';
import type { RootSystemPrimitives } from './RootSystemPrimitives.js';
import type { WateringFrequency } from './WateringFrequency.js';

export type PlantKnowledgePrimitives = {
  soil?: {
    ph: RangePrimitives;
    availableDepthCm: RangePrimitives;
  };
  rootSystem?: RootSystemPrimitives;
  watering?: {
    frequency: WateringFrequency;
    amountMm?: number;
    conditions?: string[];
  };
  light?: PlantLightPrimitives;
  pruning?: Array<PruningTypePrimitives>;
  propagation?: PlantPropagationPrimitives;
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
