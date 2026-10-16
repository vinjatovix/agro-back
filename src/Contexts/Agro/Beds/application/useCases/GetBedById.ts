import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import {
  attachCropsToBed,
  type BedReadOptions,
  type BedWithCrops
} from './attachCrops.js';

export type GetBedByIdDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
};

export class GetBedById {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;

  constructor({
    bedRepository,
    plantInstanceRepository
  }: GetBedByIdDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
  }

  async execute(
    id: string,
    user: UserSessionInfo,
    options?: BedReadOptions
  ): Promise<BedWithCrops> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );

    return attachCropsToBed(this.plantInstanceRepository, bed, user.id, {
      embedCrops: options?.embedCrops === true
    });
  }
}
