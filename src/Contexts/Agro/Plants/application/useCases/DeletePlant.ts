import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';

export type DeletePlantDependencies = {
  plantRepository: PlantRepository;
};

export class DeletePlant {
  private readonly plantRepository: PlantRepository;

  constructor({ plantRepository }: DeletePlantDependencies) {
    this.plantRepository = plantRepository;
  }

  async execute(
    id: string,
    username: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );
    ensureVersion(plant.version, expectedVersions, 'Plant', id);

    const current = plantDomainMapper.toPrimitives(plant);
    plant.markAsDeleted(username);
    const deleted = plantDomainMapper.toPrimitives(plant);

    await this.plantRepository.updateWithDiff(current, deleted);
  }
}
