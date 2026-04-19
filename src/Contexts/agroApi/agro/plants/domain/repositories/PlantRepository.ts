import type { Plant } from '../entities/Plant.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  findAll(): Promise<Plant[]>;
}
