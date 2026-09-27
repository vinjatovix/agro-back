import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export class GetBedById {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<Bed> {
    return ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );
  }
}
