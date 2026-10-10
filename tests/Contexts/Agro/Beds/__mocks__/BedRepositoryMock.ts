/* eslint-disable @typescript-eslint/require-await */

import type { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedPrimitives } from '../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import { DomainConflictException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class BedRepositoryMock
  extends BaseMongoCrudRepositoryMock<Bed, BedPrimitives>
  implements BedRepository
{
  private readonly findOwnedActiveByIdMock = jest.fn();

  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<Bed>> {
    this.findOwnedActiveByIdMock(id, userId);
    this.readCalls.findOwnedActiveById += 1;

    const bed = this.storage.get(id);

    return bed && this.isActive(bed) && bed.userId === userId
      ? this.toDomain(this.toPrimitives(bed))
      : null;
  }

  async conditionalIncrementVersion(
    id: string,
    expectedVersion: number
  ): Promise<void> {
    const bed = this.storage.get(id);
    if (!bed || !this.isActive(bed) || bed.version !== expectedVersion) {
      throw new DomainConflictException(`Bed was modified concurrently: ${id}`);
    }
    const primitives = this.toPrimitives(bed);
    primitives.version += 1;
    this.storage.set(id, this.toDomain(primitives));
  }

  findByUserId(userId: string): Promise<Bed[]> {
    const beds = Array.from(this.storage.values()).filter((bed) => {
      return bed.userId === userId;
    });
    return Promise.resolve(beds);
  }
  protected toDomain(primitives: BedPrimitives): Bed {
    return bedDomainMapper.fromPrimitives(primitives);
  }

  protected toPrimitives(entity: Bed): BedPrimitives {
    return bedDomainMapper.toPrimitives(entity);
  }

  protected entityName(): string {
    return 'Bed';
  }

  protected isActive(bed: Bed): boolean {
    return !bed.isDeleted;
  }

  assertFindOwnedActiveByIdHasBeenCalledWith(id: string, userId: string): void {
    expect(this.findOwnedActiveByIdMock).toHaveBeenCalledWith(id, userId);
  }
}
