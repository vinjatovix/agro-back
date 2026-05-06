import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import type { BedPatch } from './interfaces/BedPatch.js';

export class UpdateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(patch: BedPatch, user: UserSessionInfo): Promise<Bed> {
    const bed = await this.bedRepository.findById(patch.id);

    if (bed.userId.value !== user.id) {
      throw createError.forbidden(
        `User ${user.id} is not allowed to update this bed`
      );
    }

    const current = bedDomainMapper.toPrimitives(bed);
    const patched = applyPatch(current, patch);

    await this.bedRepository.updateWithDiff(current, patched, user.username);

    const updatedBed = await this.bedRepository.findById(patch.id);

    return updatedBed;
  }
}
