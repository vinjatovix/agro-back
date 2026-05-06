import { createError } from '../../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export class DeleteBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<void> {
    const bed = await this.bedRepository.findById(id);

    if (bed.userId.value !== user.id) {
      throw createError.forbidden(
        `User ${user.username} does not have permission to delete this bed`
      );
    }

    if (bed.plantInstances.length > 0) {
      throw createError.conflict(
        `Cannot delete bed with plants. Remove plants or transplant them first.`
      );
    }

    if (bed.isDeleted) {
      return;
    }

    bed.markAsDeleted();

    await this.bedRepository.save(bed);
  }
}
