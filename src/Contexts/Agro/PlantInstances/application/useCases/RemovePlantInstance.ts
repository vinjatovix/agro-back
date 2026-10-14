import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

export type RemovePlantInstanceDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  unitOfWork: UnitOfWork;
};

export class RemovePlantInstance {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    bedRepository,
    plantInstanceRepository,
    unitOfWork
  }: RemovePlantInstanceDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    id: string,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const crop = ensureFound(
      await this.plantInstanceRepository.findOwnedActiveById(id, user.id),
      'PlantInstance',
      id
    );
    ensureVersion(crop.version, expectedVersions, 'PlantInstance', id);

    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(crop.bedId, user.id),
      'Bed',
      crop.bedId
    );

    const currentPrimitives = crop.toPrimitives();
    crop.markAsRemoved(user.username, new Date());
    const updatedPrimitives = crop.toPrimitives();

    // The bed version raise and the removal commit together or not at all.
    await this.unitOfWork.run(async () => {
      await this.bedRepository.conditionalIncrementVersion(bed.id, bed.version);
      await this.plantInstanceRepository.updateWithDiff(
        currentPrimitives,
        updatedPrimitives
      );
    });
  }
}
