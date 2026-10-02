import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PollinationType } from './PollinationType.js';

// PATCH semantics: an absent field is kept, `null` removes an optional one.

export type PlantSowingChanges = {
  months?: number[];
  seedsPerHole?: PartialRange;
  germinationDays?: PartialRange;
  methods?: {
    direct?: { depthCm?: PartialRange };
    starter?: { depthCm?: PartialRange } | null;
  };
};

export type PlantFloweringChanges = {
  months?: number[];
  pollination?: {
    types?: PollinationType[];
    agents?: string[] | null;
  } | null;
};

export type PlantHarvestChanges = {
  months?: number[];
  description?: string | null;
};

export type PlantPhenologyChanges = {
  sowing?: PlantSowingChanges;
  flowering?: PlantFloweringChanges;
  harvest?: PlantHarvestChanges;
};
