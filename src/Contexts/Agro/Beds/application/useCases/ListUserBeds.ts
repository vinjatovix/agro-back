import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export type ListUserBedsDependencies = {
  bedRepository: BedRepository;
};

export class ListUserBeds {
  private readonly bedRepository: BedRepository;

  constructor({ bedRepository }: ListUserBedsDependencies) {
    this.bedRepository = bedRepository;
  }

  async execute(userId: string): Promise<Bed[]> {
    const beds = await this.bedRepository.findByUserId(userId);

    return beds;
  }
}
