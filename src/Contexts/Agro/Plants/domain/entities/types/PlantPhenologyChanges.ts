import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';

export type PlantSowingChanges = {
  months?: number[];
  seedsPerHole?: PartialRange;
  germinationDays?: PartialRange;
  methods?: {
    direct?: { depthCm?: PartialRange };
    starter?: { depthCm?: PartialRange };
  };
};

export type PlantPhenologyChanges = {
  sowing?: PlantSowingChanges;
};
