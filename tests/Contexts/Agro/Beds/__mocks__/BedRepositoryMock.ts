/* eslint-disable @typescript-eslint/require-await */

import type { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedPrimitives } from '../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { bedMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedMapper.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class BedRepositoryMock
  extends BaseMongoCrudRepositoryMock<Bed, BedPrimitives>
  implements BedRepository
{
  findByUserId(userId: string): Promise<Bed[]> {
    const beds = Array.from(this.storage.values()).filter((bed) => {
      return bed.userId.value === userId;
    });
    return Promise.resolve(beds);
  }
  protected toDomain(primitives: BedPrimitives): Bed {
    return bedMapper.fromPrimitives(primitives);
  }

  protected entityName(): string {
    return 'Bed';
  }
}
