import type { MonthSet } from '../../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../../shared/domain/value-objects/Range.js';
import type { Metadata } from '../../../../../../shared/domain/valueObject/Metadata.js';
import type { PlantLifecycle } from '../../value-objects/PlantLifecycicle.js';

export type CreatePlantProps = {
  id: string;
  name: string;
  scientificName?: string;
  familyId?: string;
  lifecycle: PlantLifecycle;
  size: {
    height: Range;
    spread: Range;
  };
  sowingMonths: MonthSet;
  floweringMonths: MonthSet;
  harvestMonths: MonthSet;
  spacingCm: Range;
  metadata: Metadata;
};
