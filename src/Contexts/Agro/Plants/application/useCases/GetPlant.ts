import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';

export type GetPlantDependencies = {
  plantRepository: PlantRepository;
};

export class GetPlant {
  private readonly plantRepository: PlantRepository;

  constructor({ plantRepository }: GetPlantDependencies) {
    this.plantRepository = plantRepository;
  }

  async execute(id: string, user: UserSessionInfo | undefined): Promise<Plant> {
    const plant = canSeeDeletedPlants(user)
      ? await this.plantRepository.findById(id)
      : await this.plantRepository.findActiveById(id);

    return ensureFound(plant, 'Plant', id);
  }
}
