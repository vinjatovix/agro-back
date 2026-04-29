import { createError } from '../../../../../shared/errors/index.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export class DeletePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string): Promise<void> {
    const plant = await this.plantRepository.findById(id);

    if (!plant) {
      throw createError.notFound(`Plant with ID ${id} not found`);
    }

    if (plant.isDeleted()) {
      return;
    }

    plant.markAsDeleted();

    await this.plantRepository.save(plant);
  }
}
