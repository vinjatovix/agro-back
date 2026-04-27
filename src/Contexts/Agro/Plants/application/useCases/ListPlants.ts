import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';

export class ListPlants {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(): Promise<PlantPrimitives[]> {
    const plants = await this.plantRepository.findAll();

    return plants.map((plant) => plantMapper.toPrimitives(plant));
  }
}
