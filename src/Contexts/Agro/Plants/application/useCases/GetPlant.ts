import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantReadRepository, PlantReadView } from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';

export type GetPlantDependencies = {
  plantReadRepository: PlantReadRepository;
};

export class GetPlant {
  private readonly plantReadRepository: PlantReadRepository;

  constructor({ plantReadRepository }: GetPlantDependencies) {
    this.plantReadRepository = plantReadRepository;
  }

  async execute(
    id: string,
    user: UserSessionInfo | undefined
  ): Promise<PlantReadView> {
    const plant = canSeeDeletedPlants(user)
      ? await this.plantReadRepository.findById(id)
      : await this.plantReadRepository.findActiveById(id);

    return ensureFound(plant, 'Plant', id);
  }
}
