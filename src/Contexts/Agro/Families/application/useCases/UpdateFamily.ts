import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import type { FamilyPatch } from './interfaces/FamilyPatch.js';

export class UpdateFamily {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(patch: FamilyPatch, user: string): Promise<Family> {
    const family = await this.familyRepository.findById(patch.id);

    const current = familyDomainMapper.toPrimitives(family);
    const patched = applyPatch(current, patch);
    familyDomainMapper.fromPrimitives(patched);

    await this.familyRepository.updateWithDiff(current, patched, user);

    const updatedFamily = await this.familyRepository.findById(patch.id);

    return updatedFamily;
  }
}
