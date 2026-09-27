import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export class GetPlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string, user: UserSessionInfo | undefined): Promise<Plant> {
    const plant = canSeeDeleted(user)
      ? await this.plantRepository.findById(id)
      : await this.plantRepository.findActiveById(id);

    return ensureFound(plant, 'Plant', id);
  }
}

const canSeeDeleted = (user: UserSessionInfo | undefined): boolean =>
  user?.roles.some((r) => r === 'admin' || r === 'collaborator') ?? false;
