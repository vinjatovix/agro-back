import type { Plant } from '../entities/Plant.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  updateWithDiff(
    current: Plant,
    updated: Plant,
    username: string
  ): Promise<void>;
  findAll(): Promise<Plant[]>;
  exists(id: string): Promise<boolean>;
}
