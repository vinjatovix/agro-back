import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import type { BedPatch } from './interfaces/BedPatch.js';

export class UpdateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(patch: BedPatch, user: UserSessionInfo): Promise<Bed> {
    const bed = await this.findOwnedActiveBed(patch.id, user);

    const current = bedDomainMapper.toPrimitives(bed);
    const patched = applyPatch(current, patch);

    await this.bedRepository.updateWithDiff(current, patched, user.username);

    return this.findOwnedActiveBed(patch.id, user);
  }

  private async findOwnedActiveBed(
    id: string,
    user: UserSessionInfo
  ): Promise<Bed> {
    return ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );
  }
}
