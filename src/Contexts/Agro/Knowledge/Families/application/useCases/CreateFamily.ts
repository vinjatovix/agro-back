import { createError } from '../../../../../../shared/errors/index.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyApiMapper } from '../../mappers/familyApiMapper.js';
import type { CreateFamilyDto } from './interfaces/CreateFamilyDto.js';

export class CreateFamily {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(dto: CreateFamilyDto, user: string): Promise<Family> {
    const exists = await this.familyRepository.exists(dto.id);

    if (exists) {
      throw createError.conflict(`Family already exists: ${dto.id}`);
    }

    const family = familyApiMapper.fromCreateDto(dto, user);

    await this.familyRepository.save(family);

    return family;
  }
}
