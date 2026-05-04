/* eslint-disable @typescript-eslint/require-await */
import type { Family } from '../../../../../../src/Contexts/Agro/Knowledge/Families/domain/entities/Family.js';
import type { FamilyRepository } from '../../../../../../src/Contexts/Agro/Knowledge/Families/domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyPrimitives } from '../../../../../../src/Contexts/Agro/Knowledge/Families/domain/types/FamilyPrimitives.js';
import { familyDomainMapper } from '../../../../../../src/Contexts/Agro/Knowledge/Families/mappers/familyDomainMapper.js';
import { BaseMongoCrudRepositoryMock } from '../../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class FamilyRepositoryMock
  extends BaseMongoCrudRepositoryMock<Family, FamilyPrimitives>
  implements FamilyRepository
{
  async findBySlug(slug: string): Promise<Family> {
    const family = this.storage.get(slug);
    if (!family) {
      throw new Error(`Family with slug ${slug} not found`);
    }
    return family;
  }

  protected toDomain(primitives: FamilyPrimitives): Family {
    return familyDomainMapper.fromPrimitives(primitives);
  }

  protected entityName(): string {
    return 'Family';
  }
}
