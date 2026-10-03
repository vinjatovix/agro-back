import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedInputMapper } from '../../mappers/bedInputMapper.js';
import type { CreateBedInput } from './interfaces/CreateBedInput.js';

export type CreateBedDependencies = {
  bedRepository: BedRepository;
};

export class CreateBed {
  private readonly bedRepository: BedRepository;

  constructor({ bedRepository }: CreateBedDependencies) {
    this.bedRepository = bedRepository;
  }

  async execute(dtoWithUserId: CreateBedInput, user: string): Promise<Bed> {
    const exists = await this.bedRepository.exists(dtoWithUserId.id);

    if (exists) {
      throw new DomainConflictException(
        `Bed already exists: ${dtoWithUserId.id}`
      );
    }
    const bed = bedInputMapper.fromCreateInputToDomain(dtoWithUserId, user);

    await this.bedRepository.save(bed);

    return bed;
  }
}
