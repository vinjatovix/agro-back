import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';

export class ListPlants {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(): Promise<PlantPrimitives[]> {
    const plants = await this.plantRepository.findAll();

    return plants.map((plant) => plant.toPrimitives());
  }
}
