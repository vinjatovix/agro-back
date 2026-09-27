import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import {
  DomainConflictException,
  DomainForbiddenException
} from '../../../../shared/domain/errors/index.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';

export class DeleteBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<void> {
    const bed = ensureFound(await this.bedRepository.findById(id), 'Bed', id);

    if (bed.userId !== user.id) {
      throw new DomainForbiddenException(
        `User ${user.username} does not have permission to delete this bed`
      );
    }

    if (bed.plantInstances.length > 0) {
      throw new DomainConflictException(
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
