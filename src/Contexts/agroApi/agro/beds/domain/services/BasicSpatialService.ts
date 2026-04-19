import type { PlantInstance } from '../entities/PlantInstance.js';
import type {
  SpatialContext,
  SpatialConstraints,
  SpatialService
} from './SpatialService.js';

export class BasicSpatialService implements SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    constraints: SpatialConstraints
  ): void {
    const newRadius = constraints.getRadius(newPlant);

    this.validateBounds(context, newPlant, newRadius);
    this.validateCollisions(context, newPlant, newRadius, constraints);
  }

  private validateBounds(
    context: SpatialContext,
    plant: PlantInstance,
    radius: number
  ): void {
    const { x, y } = plant.position;

    if (x - radius < 0 || y - radius < 0) {
      throw new Error('Plant out of bounds (min limit)');
    }

    if (x + radius > context.width || y + radius > context.height) {
      throw new Error('Plant out of bounds (max limit)');
    }
  }

  private validateCollisions(
    context: SpatialContext,
    newPlant: PlantInstance,
    newRadius: number,
    constraints: SpatialConstraints
  ): void {
    for (const existing of context.plants) {
      if (existing.id === newPlant.id) continue;

      const existingRadius = constraints.getRadius(existing);

      const distance = existing.position.distanceTo(newPlant.position);
      const minDistance = newRadius + existingRadius;

      if (distance < minDistance) {
        throw new Error(
          `Collision detected between ${existing.id} and ${newPlant.id}`
        );
      }
    }
  }
}
