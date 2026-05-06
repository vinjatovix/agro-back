import { createError } from '../../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export class GetBedById {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<Bed> {
    const bed = await this.bedRepository.findById(id);

    if (bed.userId.value !== user.id) {
      throw createError.forbidden(`You do not have access to this bed: ${id}`);
    }

    return bed;
  }
}
