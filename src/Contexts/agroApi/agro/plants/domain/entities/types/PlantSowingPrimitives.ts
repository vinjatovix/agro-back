import type { RangePrimitives } from '../../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';

export type PlantSowingPrimitives = {
  seedsPerHole: RangePrimitives;
  germinationDays: RangePrimitives;
  months: number[];
  methods: {
    direct: {
      depthCm: RangePrimitives;
    };
    starter?: {
      depthCm: RangePrimitives;
    };
  };
};
