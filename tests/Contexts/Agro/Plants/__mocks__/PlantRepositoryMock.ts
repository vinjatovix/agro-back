/* eslint-disable @typescript-eslint/require-await */
import { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';
import type { PlantFilter } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import type { QueryOptions } from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';

export class PlantRepositoryMock
  extends BaseMongoCrudRepositoryMock<Plant, PlantPrimitives>
  implements PlantRepository
{
  protected toDomain(primitives: PlantPrimitives): Plant {
    return plantDomainMapper.fromPrimitives(primitives);
  }

  protected entityName(): string {
    return 'Plant';
  }

  async findAll(
    options?: QueryOptions<PlantFilter>
  ): Promise<PaginatedResult<Plant>> {
    const items = await super.findAll(options);
    return {
      data: items.data,
      pagination: {
        totalItems: items.pagination.totalItems,
        page: items.pagination.page,
        limit: items.pagination.limit,
        totalPages: items.pagination.totalPages
      }
    };
  }
}
