import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyInputMapper } from '../../mappers/familyInputMapper.js';
import type { CreateFamilyDto } from './interfaces/CreateFamilyDto.js';

export type CreateFamilyDependencies = {
  familyRepository: FamilyRepository;
};

export class CreateFamily {
  private readonly familyRepository: FamilyRepository;

  constructor({ familyRepository }: CreateFamilyDependencies) {
    this.familyRepository = familyRepository;
  }

  async execute(dto: CreateFamilyDto, user: string): Promise<Family> {
    const exists = await this.familyRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Family already exists: ${dto.id}`);
    }

    const family = familyInputMapper.fromCreateDto(dto, user);

    await this.familyRepository.save(family);

    return family;
  }
}
