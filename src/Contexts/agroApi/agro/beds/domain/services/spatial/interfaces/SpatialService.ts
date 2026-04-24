import type { PlantRepository } from '../../../../../plants/domain/repositories/PlantRepository.js';
import type { PlantInstance } from '../../../entities/PlantInstance.js';

export interface SpatialContext {
  width: number;
  height: number;
  plants: PlantInstance[];
}

export interface SpatialService {
  validatePlacement(
    context: SpatialContext,
    newPlant: PlantInstance,
    plantRepository: PlantRepository
  ): Promise<void>;
}
