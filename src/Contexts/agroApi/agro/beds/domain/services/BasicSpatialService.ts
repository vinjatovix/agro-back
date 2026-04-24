import { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import type { PlantRepository } from '../../../plants/domain/repositories/PlantRepository.js';
import type { PlantInstance } from '../entities/PlantInstance.js';
import type { SpatialContext, SpatialService } from './SpatialService.js';

export class BasicSpatialService implements SpatialService {
  async validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    plantRepository: PlantRepository
  ): Promise<void> {
    const plantData = await plantRepository.findById(newPlant.plantId.value);
    const newSpacing = plantData.traits.spacingCm.max;
    const newRadius = newSpacing / 2;

    this.validateBounds(context, newPlant, newRadius);

    await this.validateCollisions(
      context,
      newPlant,
      newSpacing,
      plantRepository
    );
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

  private async validateCollisions(
    context: SpatialContext,
    newPlant: PlantInstance,
    newSpacing: number,
    plantRepository: PlantRepository
  ): Promise<void> {
    for (const existing of context.plants) {
      if (Uuid.equals(existing.id, newPlant.id)) continue;

      const existingData = await plantRepository.findById(
        existing.plantId.value
      );
      const existingSpacing = existingData.traits.spacingCm.max;
      const distance = existing.position.distanceTo(newPlant.position);
      const minDistance = Math.max(newSpacing, existingSpacing);

      if (distance < minDistance) {
        throw new Error(
          `Collision detected between ${existing.id.value} and ${newPlant.id.value}`
        );
      }
    }
  }
}
