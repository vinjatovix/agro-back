import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { Seasons } from './Seasons.js';

export type PlantPropagationPrimitives = {
  methods: Record<
    string,
    {
      seasons?: Seasons[];
      estimatedTimeWeeks?: RangePrimitives;
      bestPractices?: string[];
    }
  >;
};
