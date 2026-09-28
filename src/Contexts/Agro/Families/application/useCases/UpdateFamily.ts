import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import { familyInputMapper } from '../../mappers/familyInputMapper.js';
import type { UpdateFamilyInput } from './interfaces/UpdateFamilyInput.js';

export class UpdateFamily {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(
    input: UpdateFamilyInput,
    user: string,
    expectedVersion: number
  ): Promise<Family> {
    const family = ensureFound(
      await this.familyRepository.findById(input.id),
      'Family',
      input.id
    );

    ensureVersion(family.version, expectedVersion, 'Family', input.id);

    const changes = familyInputMapper.toChanges(input);

    if (!Object.keys(changes).length) {
      return family;
    }

    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation(changes);

    const after = familyDomainMapper.toPrimitives(family);

    await this.familyRepository.updateWithDiff(before, after, user);

    return ensureFound(
      await this.familyRepository.findById(input.id),
      'Family',
      input.id
    );
  }
}
