import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';

export class DeletePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(
    id: string,
    username: string,
    expectedVersion: number
  ): Promise<void> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );
    ensureVersion(plant.version, expectedVersion, 'Plant', id);

    const current = plantDomainMapper.toPrimitives(plant);
    plant.markAsDeleted(username);
    const deleted = plantDomainMapper.toPrimitives(plant);

    await this.plantRepository.updateWithDiff(current, deleted);
  }
}
