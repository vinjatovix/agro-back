import type { PlantRepository } from '../../../plants/domain/repositories/PlantRepository.js';
import type { PlantInstance } from '../entities/PlantInstance.js';
import type { SpatialContext, SpatialService } from './SpatialService.js';

export class BasicSpatialService implements SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    plantRepository: PlantRepository
  ): void {
    const plantData = plantRepository.findById(newPlant.plantId);
    const newRadius = plantData.spacing.max / 2;

    this.validateBounds(context, newPlant, newRadius);
    this.validateCollisions(context, newPlant, newRadius, plantRepository);
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
    plantRepository: PlantRepository
  ): void {
    for (const existing of context.plants) {
      if (existing.id === newPlant.id) continue;

      const existingPlantData = plantRepository.findById(existing.plantId);
      const existingRadius = existingPlantData.spacing.max / 2;

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
