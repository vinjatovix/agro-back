import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
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
    const family = await this.findFamily(input.idOrSlug);

    ensureVersion(family.version, expectedVersions, 'Family', family.idValue);

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

  /** One read of the aggregate, by id when the key is a UUID, else by slug. */
  private async findFamily(idOrSlug: string): Promise<Family> {
    if (UuidValidator.isValid(idOrSlug)) {
      return ensureFound(
        await this.familyRepository.findById(idOrSlug),
        'Family',
        idOrSlug
      );
    }

    return ensureFound(
      await this.familyRepository.findBySlug(idOrSlug),
      'Family',
      idOrSlug,
      'slug'
    );
  }
}
