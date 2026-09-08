import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import type { ListFamiliesDto } from './interfaces/ListFamiliesDto.js';

export class ListFamilies {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(dto?: ListFamiliesDto): Promise<PaginatedResult<Family>> {
    return this.repository.findAll(dto?.query);
  }
}
