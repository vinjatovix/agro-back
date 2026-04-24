import type { SpatialService } from './interfaces/SpatialService.js';
import type { SpatialContext } from './interfaces/SpatialContext.js';
import type { SpatialPlantModel } from './interfaces/SpatialPlantModel.js';

export class BasicSpatialService implements SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: SpatialPlantModel
  ): void {
    this.validateBounds(context, newPlant);
    this.validateCollisions(context, newPlant);
  }

  private validateBounds(
    context: SpatialContext,
    plant: SpatialPlantModel
  ): void {
    const { x, y } = plant.position;

    if (x < 0 || y < 0) {
      throw new Error('Plant out of bounds (min limit)');
    }

    if (x > context.width || y > context.height) {
      throw new Error('Plant out of bounds (max limit)');
    }
  }

  private validateCollisions(
    context: SpatialContext,
    newPlant: SpatialPlantModel
  ): void {
    for (const existing of context.plants) {
      if (existing.id === newPlant.id) continue;

      const distance = this.distance(existing.position, newPlant.position);

      const minDistance = Math.max(existing.spacingCm, newPlant.spacingCm);

      if (distance <= minDistance) {
        throw new Error(
          `Collision detected between ${existing.id} and ${newPlant.id}`
        );
      }
    }
  }

  private distance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
