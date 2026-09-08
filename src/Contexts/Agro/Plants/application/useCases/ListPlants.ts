import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Plant } from '../../domain/entities/Plant.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export class ListPlants {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(
    user: UserSessionInfo | null,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<Plant>> {
    const isAdmin = user?.roles.includes('admin');
    const userFilters = dto?.query?.filter ?? {};

    const filters = isAdmin
      ? userFilters
      : {
          ...userFilters,
          status: PlantStatus.ACTIVE
        };

    return this.plantRepository.findAll({
      ...dto?.query,
      filter: filters
    });
  }
}
