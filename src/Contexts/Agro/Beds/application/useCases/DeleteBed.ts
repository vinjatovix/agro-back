import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';

export class DeleteBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(id: string, user: UserSessionInfo): Promise<void> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );

    const current = bedDomainMapper.toPrimitives(bed);
    bed.markAsDeleted();
    const deleted = bedDomainMapper.toPrimitives(bed);

    await this.bedRepository.updateWithDiff(current, deleted, user.username);
  }
}
