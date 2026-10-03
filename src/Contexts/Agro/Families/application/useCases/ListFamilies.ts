import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import type { ListFamiliesDto } from './interfaces/ListFamiliesDto.js';

export type ListFamiliesDependencies = {
  familyRepository: FamilyRepository;
};

export class ListFamilies {
  private readonly familyRepository: FamilyRepository;

  constructor({ familyRepository }: ListFamiliesDependencies) {
    this.familyRepository = familyRepository;
  }

  async execute(dto?: ListFamiliesDto): Promise<PaginatedResult<Family>> {
    return this.familyRepository.findAll(dto?.query);
  }
}
