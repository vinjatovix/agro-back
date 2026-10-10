import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';

export type DeleteBedDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
};

export class DeleteBed {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;

  constructor({
    bedRepository,
    plantInstanceRepository
  }: DeleteBedDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
  }

  async execute(
    id: string,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );
    ensureVersion(bed.version, expectedVersions, 'Bed', id);

    const current = bedDomainMapper.toPrimitives(bed);
    const at = new Date();
    bed.markAsDeleted(user.username, at);
    const deleted = bedDomainMapper.toPrimitives(bed);

    await this.bedRepository.updateWithDiff(current, deleted);

    // The bed goes first so a stale version fails before any crop is touched.
    // Both writes are not atomic yet: roadmap Iteration 24 wraps them in a
    // transaction.
    await this.plantInstanceRepository.markAllInBedAsRemoved(
      bed.id,
      user.id,
      at,
      user.username
    );
  }
}
