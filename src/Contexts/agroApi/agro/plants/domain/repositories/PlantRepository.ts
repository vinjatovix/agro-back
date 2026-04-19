import type { Plant } from '../entities/Plant.js';

export interface PlantRepository {
  findById(id: string): Plant;
}
