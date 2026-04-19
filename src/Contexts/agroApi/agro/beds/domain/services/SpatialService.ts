import type { PlantInstance } from '../entities/PlantInstance.js';

export interface SpatialContext {
  width: number;
  height: number;
  plants: PlantInstance[];
}

export interface SpatialConstraints {
  getRadius: (plant: PlantInstance) => number;
}

export interface SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    constraints: SpatialConstraints
  ): void;
}
