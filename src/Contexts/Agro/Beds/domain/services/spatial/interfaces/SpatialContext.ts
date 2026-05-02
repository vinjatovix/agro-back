import type { PositiveNumber } from '../../../../../../shared/domain/valueObject/PositiveNumber.js';
import type { SpatialPlantModel } from './SpatialPlantModel.js';

export interface SpatialContext {
  width: PositiveNumber;
  height: PositiveNumber;
  plants: SpatialPlantModel[];
}
