import type { Plant } from '../../../plants/domain/entities/Plant.js';
import type { PlantInstance } from '../entities/PlantInstance.js';

export interface SpatialContext {
  width: number;
  height: number;
  plants: PlantInstance[];
}

export interface SpatialConstraints {
  getPlant: (plantId: string) => Plant;
}

export interface SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    constraints: SpatialConstraints
  ): void;
}
