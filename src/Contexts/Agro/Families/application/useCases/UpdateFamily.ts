import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyApiMapper } from '../../mappers/familyApiMapper.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import type { UpdateFamilyDto } from './interfaces/UpdateFamilyDto.js';

export class UpdateFamily {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(
    input: UpdateFamilyDto & { id: string },
    user: string
  ): Promise<Family> {
    const family = await this.familyRepository.findById(input.id);

    if (!family) {
      throw createError.notFound(`Family not found: ${input.id}`);
    }

    const current = familyDomainMapper.toPrimitives(family);
    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch(input);
    const patched = applyPatch(current, patch);
    familyDomainMapper.fromPrimitives(patched);

    await this.familyRepository.updateWithDiff(current, patched, user);

    const updatedFamily = await this.familyRepository.findById(input.id);

    return updatedFamily;
  }
}
