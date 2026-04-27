import type { SpatialContext } from './SpatialContext.js';
import type { SpatialPlantModel } from './SpatialPlantModel.js';

export interface SpatialService {
  validatePlacement(context: SpatialContext, newPlant: SpatialPlantModel): void;
}
