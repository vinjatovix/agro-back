import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PlantKnowledgePrimitives } from './PlantKnowledgePrimitives.js';
import type { PlantLightPrimitives } from './PlantLightPrimitives.js';
import type { PruningTypePrimitives } from './PruningPrimitves.js';
import type { RootSystemType } from './RootSystemType.js';
import type { Seasons } from './Seasons.js';
import type { WateringFrequency } from './WateringFrequency.js';

export type PropagationMethodChanges = {
  seasons?: Seasons[] | null;
  estimatedTimeWeeks?: PartialRange | null;
  bestPractices?: string[] | null;
};

// PATCH semantics: an absent field is kept, `null` removes an optional one.
// `rootSystem`, `soil`, `light` and `propagation` are required: never `null`.
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
    conditions?: string[] | null;
  } | null;
  light?: {
    hoursMin?: number;
    type?: PlantLightPrimitives['type'];
    preference?: NonNullable<PlantLightPrimitives['preference']> | null;
  };
  pruning?: PruningTypePrimitives[] | null;
  propagation?: {
    // `null` for a method removes that method.
    methods?: Record<string, PropagationMethodChanges | null>;
  };
  ecology?: {
    strategicBenefits?: string[] | null;
  } | null;
  resources?: NonNullable<PlantKnowledgePrimitives['resources']> | null;
  notes?: string[] | null;
};
