import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export class ListUserBeds {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(userId: string): Promise<Bed[]> {
    const beds = await this.bedRepository.findByUserId(userId);

    return beds;
  }
}
