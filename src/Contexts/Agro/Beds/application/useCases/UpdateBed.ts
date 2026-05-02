import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedMapper } from '../../mappers/bedMapper.js';
import type { UpdateBedInput } from './interfaces/UpdateBedInput.js';

export class UpdateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(dto: UpdateBedInput, user: string): Promise<Bed> {
    const bed = await this.bedRepository.findById(dto.id);

    if (!bed) {
      throw createError.notFound(`Bed not found: ${dto.id}`);
    }
    if (bed.metadata.createdBy !== user) {
      throw createError.forbidden(
        `User ${user} is not allowed to update this bed`
      );
    }

    const current = bedMapper.toPrimitives(bed);
    const patch = bedMapper.fromUpdateDtoToPrimitivesPatch(dto);
    const patched = applyPatch(current, patch);
    bedMapper.fromCreateInputToDomain(patched, user);

    await this.bedRepository.updateWithDiff(current, patched, user);

    const updatedBed = await this.bedRepository.findById(dto.id);

    return updatedBed;
  }
}
