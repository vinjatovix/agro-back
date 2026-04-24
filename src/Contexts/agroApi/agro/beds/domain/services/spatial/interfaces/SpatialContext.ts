import type { SpatialPlantModel } from './SpatialPlantModel.js';

export interface SpatialContext {
  width: number;
  height: number;
  plants: SpatialPlantModel[];
}
