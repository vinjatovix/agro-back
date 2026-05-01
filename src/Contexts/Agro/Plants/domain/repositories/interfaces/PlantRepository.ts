import type { Plant } from '../../entities/Plant.js';
import type { PlantPrimitives } from '../../entities/types/PlantPrimitives.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  updateWithDiff(
    current: PlantPrimitives,
    updated: PlantPrimitives,
    user: string
  ): Promise<void>;
  findAll(): Promise<Plant[]>;
  exists(id: string): Promise<boolean>;
}
