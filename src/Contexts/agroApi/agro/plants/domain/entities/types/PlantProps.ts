import type {
  MonthSet,
  Range
} from '../../../../../../../shared/domain/value-objects/index.js';
import type {
  Metadata,
  Uuid
} from '../../../../../../shared/domain/valueObject/index.js';
import type { PlantLifecycle, PlantSowing } from '../../value-objects/index.js';
import type { PlantStatus } from './PlantStatus.js';

export interface PlantProps {
  id: Uuid;
  name: string;
  scientificName?: string;
  familyId: string;

  lifecycle: PlantLifecycle;

  size: {
    height: Range;
    spread: Range;
  };

  sowing: PlantSowing;
  floweringMonths: MonthSet;
  harvestMonths: MonthSet;

  spacingCm: Range;

  metadata: Metadata;
  status?: PlantStatus;
  deletedAt?: Date;
}
