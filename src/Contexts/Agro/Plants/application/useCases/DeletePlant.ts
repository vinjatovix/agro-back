import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';

export class DeletePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string, username: string): Promise<void> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );

    const current = plantDomainMapper.toPrimitives(plant);
    plant.markAsDeleted();
    const deleted = plantDomainMapper.toPrimitives(plant);

    await this.plantRepository.updateWithDiff(current, deleted, username);
  }
}
