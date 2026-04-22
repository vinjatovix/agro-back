import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';

export class DeletePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string): Promise<void> {
    const plant = await this.plantRepository.findById(id);

    if (plant.isDeleted()) {
      return;
    }

    plant.markAsDeleted();

    await this.plantRepository.save(plant);
  }
}
