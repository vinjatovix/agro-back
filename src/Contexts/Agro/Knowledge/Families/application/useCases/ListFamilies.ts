import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import type { ListFamiliesDto } from './interfaces/ListFamiliesDto.js';

export class ListFamilies {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(dto: ListFamiliesDto) {
    const query = dto.query ?? {};

    return this.repository.findAll({
      ...query,
      pagination: query.pagination ?? { page: 1, limit: 20 }
    });
  }
}
