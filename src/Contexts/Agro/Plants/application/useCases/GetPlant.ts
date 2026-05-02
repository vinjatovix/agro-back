import { createError } from '../../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export class GetPlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<Plant> {
    const plant = await this.plantRepository.findById(id);

    if (!plant || (plant.isDeleted() && !canSeeDeleted(user?.roles))) {
      throw createError.notFound(`Plant not found: ${id}`);
    }

    return plant;
  }
}
const canSeeDeleted = (roles?: string[]) =>
  roles?.some((r) => r === 'admin' || r === 'collaborator') ?? false;
