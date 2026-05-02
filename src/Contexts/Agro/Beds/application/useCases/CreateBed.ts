import { createError } from '../../../../../shared/errors/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedMapper } from '../../mappers/bedMapper.js';
import type { CreateBedInput } from './interfaces/CreateBedInput.js';

export class CreateBed {
  constructor(private readonly bedRepository: BedRepository) {}

  async execute(dtoWithUserId: CreateBedInput, user: string): Promise<Bed> {
    const exists = await this.bedRepository.exists(dtoWithUserId.id);

    if (exists) {
      throw createError.conflict(`Bed already exists: ${dtoWithUserId.id}`);
    }
    const bed = bedMapper.fromCreateInputToDomain(dtoWithUserId, user);

    await this.bedRepository.save(bed);

    return bed;
  }
}
