import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { FamilyReadRepository, FamilyReadView } from '../queries/index.js';
import type { ListFamiliesDto } from './interfaces/ListFamiliesDto.js';

export type ListFamiliesDependencies = {
  familyReadRepository: FamilyReadRepository;
};

export class ListFamilies {
  private readonly familyReadRepository: FamilyReadRepository;

  constructor({ familyReadRepository }: ListFamiliesDependencies) {
    this.familyReadRepository = familyReadRepository;
  }

  async execute(
    dto?: ListFamiliesDto
  ): Promise<PaginatedResult<FamilyReadView>> {
    return this.familyReadRepository.findAll(dto?.query);
  }
}
