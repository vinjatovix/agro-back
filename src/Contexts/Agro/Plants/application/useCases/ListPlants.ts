import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export type ListPlantsDependencies = {
  plantRepository: PlantRepository;
};

export class ListPlants {
  private readonly plantRepository: PlantRepository;

  constructor({ plantRepository }: ListPlantsDependencies) {
    this.plantRepository = plantRepository;
  }

  async execute(
    user: UserSessionInfo | null,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<Plant>> {
    const userFilters = dto?.query?.filter ?? {};

    const filters: PlantFilter = canSeeDeletedPlants(user)
      ? userFilters
      : { ...userFilters, status: { eq: PlantStatus.ACTIVE } };

    return this.plantRepository.findAll({
      ...dto?.query,
      filter: filters
    });
  }
}
