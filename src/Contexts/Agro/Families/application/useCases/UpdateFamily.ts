import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import { familyInputMapper } from '../../mappers/familyInputMapper.js';
import type { UpdateFamilyInput } from './interfaces/UpdateFamilyInput.js';

export type UpdateFamilyDependencies = {
  familyRepository: FamilyRepository;
};

export class UpdateFamily {
  private readonly familyRepository: FamilyRepository;

  constructor({ familyRepository }: UpdateFamilyDependencies) {
    this.familyRepository = familyRepository;
  }

  async execute(
    input: UpdateFamilyInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Family> {
    const family = ensureFound(
      await this.familyRepository.findById(input.id),
      'Family',
      input.id
    );

    ensureVersion(family.version, expectedVersions, 'Family', input.id);

    const changes = familyInputMapper.toChanges(input);
    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation(changes, user);

    const after = familyDomainMapper.toPrimitives(family);

    // Always called: an empty diff is still confirmed against storage.
    family.syncVersion(
      await this.familyRepository.updateWithDiff(before, after)
    );

    return family;
  }
}
