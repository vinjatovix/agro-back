import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type { PlantReadRepository, PlantReadView } from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export type ListPlantsDependencies = {
  plantReadRepository: PlantReadRepository;
};

export class ListPlants {
  private readonly plantReadRepository: PlantReadRepository;

  constructor({ plantReadRepository }: ListPlantsDependencies) {
    this.plantReadRepository = plantReadRepository;
  }

  async execute(
    user: UserSessionInfo | null,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<PlantReadView>> {
    const userFilters = dto?.query?.filter ?? {};

    const filters: PlantFilter = canSeeDeletedPlants(user)
      ? userFilters
      : { ...userFilters, status: { eq: PlantStatus.ACTIVE } };

    return this.plantReadRepository.findAll({
      ...dto?.query,
      filter: filters
    });
  }
}
