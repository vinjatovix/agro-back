import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export class DeletePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string): Promise<void> {
    const plant = ensureFound(
      await this.plantRepository.findById(id),
      'Plant',
      id
    );

    if (plant.isDeleted()) {
      return;
    }

    plant.markAsDeleted();

    await this.plantRepository.save(plant);
  }
}
