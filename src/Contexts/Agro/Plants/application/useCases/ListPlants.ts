import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type {
  FamilySummaryReader,
  PlantReadRepository,
  PlantSparseView
} from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import { embedFamilySummaries, embedsFamily } from './embedFamilySummaries.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export type ListPlantsDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
};

export class ListPlants {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    plantReadRepository,
    familySummaryReader
  }: ListPlantsDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<PlantSparseView>> {
    const options = dto?.query ?? {};
    // Relations are resolved here, never by the repository.
    const { include: _include, ...query } = options;
    const userFilters = query.filter ?? {};

    const filters: PlantFilter = canSeeDeletedPlants(user)
      ? userFilters
      : { ...userFilters, status: { eq: PlantStatus.ACTIVE } };

    const page = await this.plantReadRepository.findAll({
      ...query,
      filter: filters
    });

    if (!embedsFamily(options)) return page;

    return {
      ...page,
      data: await embedFamilySummaries(page.data, this.familySummaryReader)
    };
  }
}
