import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export type GetBedByIdDependencies = {
  bedRepository: BedRepository;
};

export class GetBedById {
  private readonly bedRepository: BedRepository;

  constructor({ bedRepository }: GetBedByIdDependencies) {
    this.bedRepository = bedRepository;
  }

  async execute(id: string, user: UserSessionInfo): Promise<Bed> {
    return ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );
  }
}
