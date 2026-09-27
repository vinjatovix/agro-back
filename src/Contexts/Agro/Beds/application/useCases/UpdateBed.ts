import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { DomainForbiddenException } from '../../../../shared/domain/errors/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import type { BedPatch } from './interfaces/BedPatch.js';

export class UpdateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(patch: BedPatch, user: UserSessionInfo): Promise<Bed> {
    const bed = ensureFound(
      await this.bedRepository.findById(patch.id),
      'Bed',
      patch.id
    );

    if (bed.userId !== user.id) {
      throw new DomainForbiddenException(
        `User ${user.id} is not allowed to update this bed`
      );
    }

    const current = bedDomainMapper.toPrimitives(bed);
    const patched = applyPatch(current, patch);

    await this.bedRepository.updateWithDiff(current, patched, user.username);

    const updatedBed = ensureFound(
      await this.bedRepository.findById(patch.id),
      'Bed',
      patch.id
    );

    return updatedBed;
  }
}
