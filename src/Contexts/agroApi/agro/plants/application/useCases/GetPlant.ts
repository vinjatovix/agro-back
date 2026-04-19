import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';

export class GetPlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string): Promise<PlantPrimitives> {
    const plant = await this.plantRepository.findById(id);

    if (!plant) {
      throw new Error(`Plant not found: ${id}`);
    }

    return plant.toPrimitives();
  }
}
