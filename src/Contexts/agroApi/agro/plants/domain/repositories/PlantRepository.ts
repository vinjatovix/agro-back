import type { Plant } from '../entities/Plant.js';
import type { PlantPatch } from '../entities/PlantPatch.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  update(plant: PlantPatch, username: string): Promise<void>;
  findAll(): Promise<Plant[]>;
  exists(id: string): Promise<boolean>;
}
