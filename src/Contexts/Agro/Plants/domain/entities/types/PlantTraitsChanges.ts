import type { PartialRange } from '../../../../../../shared/domain/value-objects/interfaces/PartialRange.js';
import type { PlantLifecycleValue } from './PlantLifecycleValue.js';

export type PlantTraitsChanges = {
  lifecycle?: PlantLifecycleValue;
  size?: {
    height?: PartialRange;
    spread?: PartialRange;
  };
  spacingCm?: PartialRange;
};
