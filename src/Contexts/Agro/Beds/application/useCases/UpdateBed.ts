import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import { bedInputMapper } from '../../mappers/bedInputMapper.js';
import { attachCropsToBed, type BedWithCrops } from './attachCrops.js';
import type { UpdateBedInput } from './interfaces/UpdateBedInput.js';

export type UpdateBedDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
};

export class UpdateBed {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;

  constructor({
    bedRepository,
    plantInstanceRepository
  }: UpdateBedDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
  }

  async execute(
    input: UpdateBedInput,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<BedWithCrops> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(input.id, user.id),
      'Bed',
      input.id
    );
    ensureVersion(bed.version, expectedVersions, 'Bed', input.id);

    const changes = bedInputMapper.toChanges(input);
    const before = bedDomainMapper.toPrimitives(bed);
    // One timestamp for the whole request, whatever fields it touches.
    const at = new Date();

    // Only the fields sent are touched: `{}` leaves the bed and its audit data
    // as they are.
    if (changes.name !== undefined) {
      bed.rename(changes.name, user.username, at);
    }
    if (Object.keys(changes.dimensions).length > 0) {
      bed.resize(changes.dimensions, user.username, at);
    }

    const after = bedDomainMapper.toPrimitives(bed);

    // Always called: an empty diff is still confirmed against storage.
    bed.syncVersion(await this.bedRepository.updateWithDiff(before, after));

    return attachCropsToBed(this.plantInstanceRepository, bed, user.id, {
      embedCrops: false
    });
  }
}
