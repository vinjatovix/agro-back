import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { SowingMethod } from './SowingMethod.js';

export interface PlantSowingProps {
  seedsPerHole: Range;
  germinationDays: Range;
  months: MonthSet;
  methods: {
    direct: SowingMethod;
    starter?: SowingMethod;
  };
}
