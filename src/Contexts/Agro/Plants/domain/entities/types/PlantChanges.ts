import type { PlantIdentityChanges } from './PlantIdentityChanges.js';
import type { PlantKnowledgeChanges } from './PlantKnowledgeChanges.js';
import type { PlantPhenologyChanges } from './PlantPhenologyChanges.js';
import type { PlantTraitsChanges } from './PlantTraitsChanges.js';

export type PlantChanges = {
  identity?: PlantIdentityChanges;
  traits?: PlantTraitsChanges;
  phenology?: PlantPhenologyChanges;
  knowledge?: PlantKnowledgeChanges;
};
