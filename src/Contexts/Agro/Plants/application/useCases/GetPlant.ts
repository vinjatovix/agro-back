import { createError } from '../../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';

export class GetPlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<PlantPrimitives> {
    const plant = await this.plantRepository.findById(id);

    if (!plant || (plant.isDeleted() && !canSeeDeleted(user?.roles))) {
      throw createError.notFound(`Plant not found: ${id}`);
    }

    return plantMapper.toPrimitives(plant);
  }
}
const canSeeDeleted = (roles?: string[]) =>
  roles?.some((r) => r === 'admin' || r === 'collaborator') ?? false;
