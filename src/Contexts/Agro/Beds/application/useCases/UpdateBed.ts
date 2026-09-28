import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedChanges } from '../../domain/entities/types/BedChanges.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import { bedInputMapper } from '../../mappers/bedInputMapper.js';
import type { UpdateBedInput } from './interfaces/UpdateBedInput.js';

export class UpdateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(
    input: UpdateBedInput,
    user: UserSessionInfo,
    expectedVersion: number
  ): Promise<Bed> {
    const bed = await this.findOwnedActiveBed(input.id, user);
    ensureVersion(bed.version, expectedVersion, 'Bed', input.id);

    const changes = bedInputMapper.toChanges(input);

    if (!this.hasAnyChanges(changes)) {
      return bed;
    }

    const before = bedDomainMapper.toPrimitives(bed);

    if (changes.name !== undefined) {
      bed.rename(changes.name);
    }
    bed.resize(changes.dimensions);

    const after = bedDomainMapper.toPrimitives(bed);

    await this.bedRepository.updateWithDiff(before, after, user.username);

    return this.findOwnedActiveBed(input.id, user);
  }

  private hasAnyChanges(changes: BedChanges): boolean {
    return (
      changes.name !== undefined || Object.keys(changes.dimensions).length > 0
    );
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
