import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import {
  attachCrops,
  type BedReadOptions,
  type BedWithCrops
} from './attachCrops.js';

export type ListUserBedsDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
};

export class ListUserBeds {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;

  constructor({
    bedRepository,
    plantInstanceRepository
  }: ListUserBedsDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
  }

  async execute(
    userId: string,
    options?: BedReadOptions
  ): Promise<BedWithCrops[]> {
    const beds = await this.bedRepository.findByUserId(userId);

    return attachCrops(this.plantInstanceRepository, beds, userId, {
      embedCrops: options?.embedCrops === true
    });
  }
}
