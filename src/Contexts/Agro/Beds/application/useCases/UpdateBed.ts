import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { Bed } from '../../domain/entities/Bed.js';
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
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(input.id, user.id),
      'Bed',
      input.id
    );
    ensureVersion(bed.version, expectedVersion, 'Bed', input.id);

    const changes = bedInputMapper.toChanges(input);
    const before = bedDomainMapper.toPrimitives(bed);
    // One timestamp for the whole request, whatever fields it touches.
    const at = new Date();

    if (changes.name !== undefined) {
      bed.rename(changes.name, user.username, at);
    }
    bed.resize(changes.dimensions, user.username, at);

    const after = bedDomainMapper.toPrimitives(bed);

    // Always called: an empty diff is still confirmed against storage.
    bed.syncVersion(await this.bedRepository.updateWithDiff(before, after));

    return bed;
  }
}
