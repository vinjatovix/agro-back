import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { PaginationParams } from '../../../../../shared/domain/query/interfaces/PaginationParams.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

export type ListPlantInstancesInput = {
  filter?:
    | {
        bedId?: { eq?: string | undefined } | undefined;
        plantId?: { eq?: string | undefined } | undefined;
      }
    | undefined;
  sort?:
    | {
        plantedAt?: 'asc' | 'desc' | undefined;
      }
    | undefined;
  pagination?:
    | {
        page?: number | undefined;
        limit?: number | undefined;
      }
    | undefined;
};

export type ListPlantInstancesDependencies = {
  plantInstanceRepository: PlantInstanceRepository;
};

function extractFilter(filter: ListPlantInstancesInput['filter']) {
  if (!filter) return {};
  return {
    bedId: filter.bedId?.eq,
    plantId: filter.plantId?.eq
  };
}

function extractPagination(
  pagination: ListPlantInstancesInput['pagination']
): PaginationParams {
  if (!pagination) return { page: 1, limit: 25 };
  return {
    page: pagination.page ?? 1,
    limit: pagination.limit ?? 25
  };
}

function extractSort(sort: ListPlantInstancesInput['sort']) {
  if (!sort?.plantedAt) return undefined;
  return { field: 'plantedAt' as const, order: sort.plantedAt };
}

export class ListPlantInstances {
  private readonly repository: PlantInstanceRepository;

  constructor({ plantInstanceRepository }: ListPlantInstancesDependencies) {
    this.repository = plantInstanceRepository;
  }

  async execute(
    input: ListPlantInstancesInput,
    user: UserSessionInfo
  ): Promise<PaginatedResult<PlantInstance>> {
    const { bedId, plantId } = extractFilter(input.filter);
    const pagination = extractPagination(input.pagination);
    const sort = extractSort(input.sort);

    return this.repository.listOwnedActive({
      userId: user.id,
      bedId,
      plantId,
      sort,
      pagination
    });
  }
}
