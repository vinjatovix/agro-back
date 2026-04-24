import type { PlantKnowledgePrimitives } from '../../entities/types/PlantKnowledgePrimitives.js';
import type { PlantLightPrimitives } from '../../entities/types/PlantLightPrimitives.js';
import type { PlantPropagationPrimitives } from '../../entities/types/PlantPropagationPrimitives.js';
import type { PruningTypePrimitives } from '../../entities/types/PruningPrimitves.js';
import type { WateringFrequency } from '../../entities/types/WateringFrequency.js';
import type { RootSystem } from '../RootSystem.js';
import type { SoilProfile } from '../SoilProfile.js';

export interface PlantKnowledgeProps {
  soil?: SoilProfile;

  rootSystem?: RootSystem;

  watering?: {
    frequency: WateringFrequency;
    conditions?: string[];
  };

  light?: PlantLightPrimitives;

  pruning?: PruningTypePrimitives[];

  propagation?: PlantPropagationPrimitives;

  ecology?: {
    strategicBenefits?: string[];
  };

  resources?: PlantKnowledgePrimitives['resources'];

  notes?: string[];
}
